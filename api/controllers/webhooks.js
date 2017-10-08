'use strict';

import { forEach, includes } from 'lodash';
import { parallel } from 'async';
const webhookKey = process.env.WEBHOOK_KEY || '123';
const aggregationRefreshPeriod = process.env.AGGREGATION_REFRESH_PERIOD || 45 * 60 * 1000;
import { log } from '../services/logger';
import { default as redis, getLastUpdated } from '../services/redis';

/**
* Handle incoming webhooks. Implements all protocols supported by /webhooks endpoint
*
* @param {Object} payload - Payload contains query paramters and their values
* @param {Object} redis - Refernce to Redis object
* @param {recordsCallback} cb - The callback that returns the records
*/
module.exports.handleAction = function (payload, cb) {
  // Make sure we have an action and a good key
  if (!payload || payload.action === undefined || payload.key === undefined || payload.key !== webhookKey) {
    return cb({error: 'No action or invalid key provided.'});
  }

  switch (payload.action) {
    case 'DATABASE_UPDATED':
      if (redis && redis.ready) {
        // Rebuild cache instead of waiting for first query
        runCachedQueries(redis);
      }
      break;
    default:
      log(['warn'], 'Invalid action provided', payload.action);
      return cb({error: 'Invalid action provided.'});
  }

  return cb(null);
};

var runCachedQueries = function (redis) {
  // Short circuit this based on env var in case we're having problems with generating the
  // aggregations. This will just keep using the old cache.
  if (process.env.DO_NOT_UPDATE_CACHE) {
    return log(['info'], 'Database updated but not running any cache queries for now.');
  }

  // Check if we need to run cached queries based on last time cache was updated
  if (getLastUpdated() && (new Date() - new Date(getLastUpdated())) < aggregationRefreshPeriod) {
    return log(['info'], `Database updated but not running any cache queries since we're within the refresh period: ${(new Date() - new Date(getLastUpdated())) / 60 / 1000} < ${aggregationRefreshPeriod / 60 / 1000}`);
  }

  // Check to make sure none of the aggregations are already running
  parallel([
    (done) => {
      require('./locations').isActive((err, active) => {
        done(err, active);
      });
    },
    (done) => {
      require('./latest').isActive((err, active) => {
        done(err, active);
      });
    },
    (done) => {
      require('./countries').isActive((err, active) => {
        done(err, active);
      });
    },
    (done) => {
      const query = {};
      require('./measurements').isActive(query, (err, active) => {
        done(err, active);
      });
    }
  ], (err, results) => {
    if (err) {
      log(['error'], err);
    }
    console.log(results);
    // Check now to see if we have any active aggregations
    if (includes(results, true)) {
      return log(['info'], 'Database updated but not running any cache queries because one is already running.');
    }

    // Run the queries to build up the cache.
    // Run 3 major aggregations in parallel and handle count at the end
    log(['info'], 'Database updated, running new cache queries.');
    parallel({
      'LOCATIONS': function (done) {
        require('./locations').queryDatabase((err, results) => {
          if (err) {
            log(['error'], err);
          }
          log(['info'], 'LOCATIONS cache query done');
          done(err, JSON.stringify(results));
        });
      },
      'LATEST': function (done) {
        require('./latest').queryDatabase((err, results) => {
          if (err) {
            log(['info'], err);
          }
          log(['info'], 'LATEST cache query done');
          done(err, JSON.stringify(results));
        });
      },
      'COUNTRIES': function (done) {
        require('./countries').queryDatabase((err, results) => {
          if (err) {
            log(['error'], err);
          }
          log(['info'], 'COUNTRIES cache query done');
          done(err, JSON.stringify(results));
        });
      }
    },
    function (err, results) {
      if (err) {
        log(['error'], err);
        return log(['error'], 'New cache queries had errors, keeping current cache');
      }

      // Generate COUNT from COUNTRIES query
      const query = {};
      results['COUNT'] = 0;
      JSON.parse(results['COUNTRIES']).map((c) => {
        results['COUNT'] += parseInt(c.count);
      });
      log(['info'], `${JSON.stringify(query)} COUNT cache query done`);

      log(['info'], 'New cache queries done, dumping current cache.');
      redis.flushall(function (err, reply) {
        log(['info'], 'Finished dumping cache, updating with new query results.');
        if (err) {
          log(['error'], err);
        }

        // Do a multi-insert into Redis
        var multi = redis.multi();
        forEach(results, function (v, k) {
          multi.set(k, v);
        });
        multi.exec(function (err, replies) {
          log(['debug'], replies);
          log(['info'], 'Cache completed rebuilding.');
          if (err) {
            return log(['error'], err);
          }

          // Send a Redis update to let all other instances know of last time
          // updated
          let message = {
            type: 'DATABASE_UPDATED',
            updatedAt: new Date().toUTCString()
          };
          redis.publish('SYSTEM_UPDATES', JSON.stringify(message));
        });
      });
    });
  });
};

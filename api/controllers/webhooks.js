'use strict';

var _ = require('lodash');
var async = require('async');
var webhookKey = process.env.WEBHOOK_KEY || '123';
import { log } from '../services/logger';
import redis from '../services/redis';

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
    return log(['info'], 'Database updated, but not running any cache queries for now.');
  }

  // Run the queries to build up the cache.
  log(['info'], 'Database updated, running new cache queries.');
  async.parallel({
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
    },
    'COUNT': function (done) {
      const query = {};
      require('./measurements').queryCount(query, true, (err, results) => {
        if (err) {
          log(['error'], err);
        }
        log(['info'], `${JSON.stringify(query)} COUNT cache query done`);
        done(err, JSON.stringify(results));
      });
    }
  },
  function (err, results) {
    if (err) {
      log(['error'], err);
      return log(['error'], 'New cache queries had errors, keeping current cache');
    }

    log(['info'], 'New cache queries done, dumping current cache.');
    redis.flushall(function (err, reply) {
      log(['info'], 'Finished dumping cache, updating with new query results.');
      if (err) {
        log(['error'], err);
      }

      // Do a multi-insert into Redis
      var multi = redis.multi();
      _.forEach(results, function (v, k) {
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
};

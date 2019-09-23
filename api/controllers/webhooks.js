'use strict';
import config from 'config';
import { forEach, includes } from 'lodash';
import { parallel } from 'async';
import { log } from '../services/logger';
import { default as redis, getLastUpdated } from '../services/redis';
import { startAthenaSyncTask } from '../services/athena-sync';

const webhookKey = config.get('webhookKey');
const aggregationRefreshPeriod = config.get('aggregationRefreshPeriod');

/**
 * Handle incoming webhooks. Implements all protocols supported by /webhooks endpoint
 *
 * @param {Object} payload - Payload contains query parameters and their values
 * @param {Object} redis - Reference to Redis object
 * @param {recordsCallback} cb - The callback that returns the records
 */
module.exports.handleAction = function (payload, cb) {
  // Make sure we have an action and a good key
  if (
    !payload ||
    payload.action === undefined ||
    payload.key === undefined ||
    payload.key !== webhookKey
  ) {
    return cb({ error: 'No action or invalid key provided.' });
  }

  switch (payload.action) {
    case 'DATABASE_UPDATED':
      startAthenaSyncTask();
      if (redis && redis.ready) {
        // Rebuild cache instead of waiting for first query
        runCachedQueries(redis);
      }
      break;
    default:
      log(['warn'], 'Invalid action provided', payload.action);
      return cb({ error: 'Invalid action provided.' });
  }

  return cb(null);
};

var runCachedQueries = function (redis) {
  // Short circuit this based on env var in case we're having problems with generating the
  // aggregations. This will just keep using the old cache.
  if (process.env.DO_NOT_UPDATE_CACHE) {
    return log(
      ['info'],
      'Database updated but not running any cache queries for now.'
    );
  }

  // Check if we need to run cached queries based on last time cache was updated
  if (
    getLastUpdated() &&
    new Date() - new Date(getLastUpdated()) < aggregationRefreshPeriod
  ) {
    return log(
      ['info'],
      `Database updated but not running any cache queries since we're within the refresh period: ${(new Date() -
        new Date(getLastUpdated())) /
        60 /
        1000} < ${aggregationRefreshPeriod / 60 / 1000}`
    );
  }

  // Check to make sure none of the aggregations are already running
  parallel(
    [
      done => {
        require('./latest').isActive((err, active) => {
          done(err, active);
        });
      }
    ],
    (err, results) => {
      if (err) {
        log(['error'], err);
      }

      // Check now to see if we have any active aggregations
      if (includes(results, true)) {
        return log(
          ['info'],
          'Database updated but not running any cache queries because one is already running.'
        );
      }

      // Run the queries to build up the cache.
      // Run latest aggregation
      log(['info'], 'Database updated, running new cache queries.');
      parallel(
        {
          LATEST: function (done) {
            require('./latest').queryDatabase((err, results) => {
              if (err) {
                log(['info'], err);
              }
              log(['info'], 'LATEST cache query done');
              done(err, JSON.stringify(results));
            });
          }
        },
        function (err, results) {
          if (err) {
            log(['error'], err);
            return log(
              ['error'],
              'New cache queries had errors, keeping current cache'
            );
          }

          log(['info'], 'New cache queries done, dumping current cache.');
          redis.flushall(function (err, reply) {
            log(
              ['info'],
              'Finished dumping cache, updating with new query results.'
            );
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
        }
      );
    }
  );
};

'use strict';

var _ = require('lodash');
var async = require('async');
var webhookKey = process.env.WEBHOOK_KEY || '123';

/**
* Handle incoming webhooks. Implements all protocols supported by /webhooks endpoint
*
* @param {Object} payload - Payload contains query paramters and their values
* @param {Object} redis - Refernce to Redis object
* @param {recordsCallback} cb - The callback that returns the records
*/
module.exports.handleAction = function (payload, redis, cb) {
  // Make sure we have an action and a good key
  if (payload.action === undefined || payload.key === undefined || payload.key !== webhookKey) {
    return cb({error: 'No action or invalid key provided.'});
  }

  switch (payload.action) {
    case 'DATABASE_UPDATED':
      if (redis.ready) {
        // Rebuild cache instead of waiting for first query
        runCachedQueries(redis);
      }
      break;
    default:
      console.warn('Invalid action provided', payload.action);
      return cb({error: 'Invalid action provided.'});
  }

  return cb(null);
};

var runCachedQueries = function (redis) {
  // Run the queries to build up the cache.
  console.info('Database updated, running new cache queries.');
  async.parallel({
    'LOCATIONS': function (done) {
      require('./locations').queryDatabase((err, results) => {
        if (err) {
          console.error(err);
        }
        console.info('LOCATIONS cache query done');
        done(null, JSON.stringify(results));
      });
    },
    'LATEST': function (done) {
      require('./latest').queryDatabase((err, results) => {
        if (err) {
          console.error(err);
        }
        console.info('LATEST cache query done');
        done(null, JSON.stringify(results));
      });
    },
    'CITIES': function (done) {
      require('./cities').queryDatabase((err, results) => {
        if (err) {
          console.error(err);
        }
        console.info('CITIES cache query done');
        done(null, JSON.stringify(results));
      });
    },
    'COUNTRIES': function (done) {
      require('./countries').queryDatabase((err, results) => {
        if (err) {
          console.error(err);
        }
        console.log('COUNTRIES cache query done');
        done(null, JSON.stringify(results));
      });
    }
  },
  function (err, results) {
    if (err) {
      console.error(err);
    }

    console.info('New cache queries done, dumping current cache.');
    redis.flushall(function (err, reply) {
      console.info('Finished dumping cache, updating with new query results.');
      if (err) {
        console.error(err);
      }

      // Do a multi-insert into Redis
      var multi = redis.multi();
      _.forEach(results, function (v, k) {
        multi.set(k, v);
      });
      multi.exec(function (err, replies) {
        if (err) {
          console.error(err);
        }
        console.log(replies);
        console.info('Cache completed rebuilding.');
      });
    });
  });
};

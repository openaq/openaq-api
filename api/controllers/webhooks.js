'use strict';

var async = require('async');
var request = require('request');
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
      // Dump Redis caches if we have a redis connection
      if (redis.ready) {
        console.info('Starting to dump cache.');
        redis.flushall(function (err, reply) {
          console.info('Finished dumping cache.');
          if (err) {
            console.error(err);
          }

          // Rebuild cache instead of waiting for first query
          runCachedQueries(redis);
        });
      }
      break;
    default:
      console.warn('Invalid action provided', payload.action);
      return cb({error: 'Invalid action provided.'});
  }

  return cb(null);
};

var runCachedQueries = function (redis) {
  var baseURL = process.env.API_URL || 'http://localhost:3004/v1/';
  // Run the queries to build up the cache, I'm cheating and just calling the
  // exposed urls because I was running into issue doing it internally. :(
  console.info('Rebuilding cache.');
  async.parallel([
    function (done) {
      request(baseURL + 'locations', function () {
        done(null);
      });
    },
    function (done) {
      request(baseURL + 'locations?has_geo', function () {
        done(null);
      });
    },
    function (done) {
      request(baseURL + 'latest', function () {
        done(null);
      });
    },
    function (done) {
      request(baseURL + 'latest?has_geo', function () {
        done(null);
      });
    },
    function (done) {
      request(baseURL + 'cities', function () {
        done(null);
      });
    },
    function (done) {
      request(baseURL + 'countries', function () {
        done(null);
      });
    }
  ],
  function () {
    console.info('Cache completed rebuilding.');
  });
};

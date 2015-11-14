'use strict';

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
        redis.del('CACHED_LOCATIONS');
        redis.del('CACHED_LATEST');
        redis.del('CACHED_COUNTRIES');
        redis.del('CACHED_CITIES');

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
  // Run the queries to build up the cache
  require('./cities').query({}, redis, function (err) {
    if (err) {
      console.error(err);
    }
  });
  require('./countries').query({}, redis, function (err) {
    if (err) {
      console.error(err);
    }
  });
  require('./locations').query({}, redis, function (err) {
    if (err) {
      console.error(err);
    }
  });
  require('./latest').query({}, redis, function (err) {
    if (err) {
      console.error(err);
    }
  });
};

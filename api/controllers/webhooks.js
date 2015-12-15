'use strict';

var _ = require('lodash');
var async = require('async');
var webhookKey = process.env.WEBHOOK_KEY || '123';
var mongoHoldTime = process.env.MONGO_HOLD_TIME || 5000;

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
  // Run the queries to build up the cache, I'm cheating and just calling the
  // exposed urls because I was running into issue doing it internally. :(
  console.info('Database updated, running new cache queries.');
  async.series({
    'LOCATIONS': function (done) {
      require('./locations').query({}, redis, false, function (err, docs) {
        if (err) {
          console.error(err);
        }
        console.log('Query done');
        // Now hold for a bit
        setTimeout(function () {
          console.log('Done waiting');
          done(null, JSON.stringify(docs));
        }, mongoHoldTime);
      });
    },
    'LATEST+has_geo=': function (done) {
      require('./latest').query({ has_geo: true }, redis, false, function (err, docs) {
        if (err) {
          console.error(err);
        }
        console.log('Query done');
        // Now hold for a bit
        setTimeout(function () {
          console.log('Done waiting');
          done(null, JSON.stringify(docs));
        }, mongoHoldTime);
      });
    },
    'LATEST': function (done) {
      require('./latest').query({}, redis, false, function (err, docs) {
        if (err) {
          console.error(err);
        }
        console.log('Query done');
        // Now hold for a bit
        setTimeout(function () {
          console.log('Done waiting');
          done(null, JSON.stringify(docs));
        }, mongoHoldTime);
      });
    },
    'LOCATIONS+has_geo=': function (done) {
      require('./locations').query({ has_geo: true }, redis, false, function (err, docs) {
        if (err) {
          console.error(err);
        }
        console.log('Query done');
        // Now hold for a bit
        setTimeout(function () {
          console.log('Done waiting');
          done(null, JSON.stringify(docs));
        }, mongoHoldTime);
      });
    },
    'CITIES': function (done) {
      require('./cities').query({}, redis, false, function (err, docs) {
        if (err) {
          console.error(err);
        }
        console.log('Query done');
        // Now hold for a bit
        setTimeout(function () {
          console.log('Done waiting');
          done(null, JSON.stringify(docs));
        }, mongoHoldTime);
      });
    },
    'COUNTRIES': function (done) {
      require('./countries').query({}, redis, false, function (err, docs) {
        if (err) {
          console.error(err);
        }
        console.log('Query done');
        // Now hold for a bit
        setTimeout(function () {
          console.log('Done waiting');
          done(null, JSON.stringify(docs));
        }, mongoHoldTime);
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

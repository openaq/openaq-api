'use strict';

var _ = require('lodash');

var db = require('../services/db.js').db;
var utils = require('../../lib/utils');

var cacheName = 'CACHED_LOCATIONS';

/**
* Query distinct Locations. Implements all protocols supported by /locations endpoint
*
* @param {Object} payload - Payload contains query paramters and their values
* @param {recordsCallback} cb - The callback that returns the records
*/
module.exports.query = function (payload, redis, cb) {
  var sendResults = function (err, data) {
    cb(err, data, data.length);
  };

  var queryDatabase = function () {
    // Get the collection
    var c = db.collection('measurements');

    // Turn the payload into something we can use with mongo
    payload = utils.queryFromParameters(payload);

    // Execute the search and return the result via callback
    c.aggregate(
      [{ '$match': payload },
      { '$group': {
        '_id': { country: '$country', city: '$city', location: '$location' },
        'count': { $sum: 1 },
        'sourceName': { $first: '$sourceName' },
        'firstUpdated': { $min: '$date.utc' },
        'lastUpdated': { $max: '$date.utc' },
        'parameters': { $addToSet: '$parameter' }
      }
      },
      { $sort: { '_id.country': 1, '_id.city': 1, '_id.location': 1 } }
      ]).toArray(function (err, docs) {
        if (err) {
          return cb(err);
        }

        // Send result to client
        sendResults(null, docs);

        // Save the data to cache if we have no payload
        if (_.keys(payload).length === 0) {
          redis.set(cacheName, JSON.stringify(docs));
        }

        return;
      });
  };

  // Send back cached result if we have it
  if (redis.ready) {
    redis.get(cacheName, function (err, reply) {
      if (err) {
        console.error(err);
      } else if (reply) {
        try {
          var data = JSON.parse(reply);
          return sendResults(null, data);
        } catch (e) {
          console.error(e);
        }
      }

      // If we're here, try a database query since Redis failed us
      queryDatabase();
    });
  } else {
    // Query database if we have no Redis connection
    queryDatabase();
  }
};

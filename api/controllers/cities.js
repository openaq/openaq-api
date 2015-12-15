'use strict';

var _ = require('lodash');

var db = require('../services/db.js').db;
var utils = require('../../lib/utils');

var cacheName = 'CITIES';

/**
* Query distinct cities. Implements all protocols supported by /cities endpoint
*
* @param {Object} payload - Payload contains query paramters and their values
* @param {recordsCallback} cb - The callback that returns the records
*/
module.exports.query = function (payload, redis, checkCache, cb) {
  // Save payload to use for caching
  var oPayload = _.cloneDeep(payload);

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
        'loc_count': { $sum: 1 }
      }
      },
      { '$group': {
        '_id': { country: '$_id.country', city: '$_id.city' },
        'locations': { $sum: 1 },
        'count': { $sum: '$loc_count' }
      }
      },
      { $sort: { '_id.city': 1 } }
      ]).toArray(function (err, docs) {
        if (err) {
          return cb(err);
        }

        // Move the _id result block to the top level and make some other changes
        docs = _.map(docs, function (d) {
          d = _.merge(d, d._id);
          d = _.omit(d, '_id');
          return d;
        });

        // Send result to client
        sendResults(null, docs);

        // Save the data to cache
        redis.set(utils.payloadToKey(cacheName, oPayload), JSON.stringify(docs));

        return;
      });
  };

  // Send back cached result if we have it and it matches our cached search
  if (checkCache && redis.ready) {
    redis.get(utils.payloadToKey(cacheName, oPayload), function (err, reply) {
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

'use strict';

var _ = require('lodash');

var db = require('../services/db.js').db;
var utils = require('../../lib/utils');

var cacheName = 'CACHED_LATEST';

/**
* Get latest for all locations. Implements all protocols supported by /latest endpoint
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
        { $sort: { 'date.utc': -1 } },
        { '$group': {
          '_id': { country: '$country', city: '$city', location: '$location', parameter: '$parameter', coordinates: '$coordinates', unit: '$unit' },
          'lastUpdated': { $first: '$date.utc' },
          'value': { $first: '$value' },
          'coordinates': { $first: '$coordinates' }
        }
        }
      ], { allowDiskUse: true }).toArray(function (err, docs) {
        if (err) {
          return cb(err);
        }

        docs = groupResults(docs);

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

/**
* This is a big ugly function to group the results from the db into something
* nicer for display.
*
* @param {Array} docs - The db aggregation results
*/
var groupResults = function (docs) {
  var grouped = _.groupBy(docs, '_id.location');
  var final = [];
  _.forEach(grouped, function (m) {
    var measurements = _.map(m, function (m) {
      return {
        parameter: m['_id']['parameter'],
        value: m.value,
        lastUpdated: m.lastUpdated,
        unit: m['_id']['unit']
      };
    });
    var f = {
      location: m[0]['_id']['location'],
      city: m[0]['_id']['city'],
      country: m[0]['_id']['country'],
      coordinates: m[0]['_id']['coordinates'],
      measurements: measurements
    };

    final.push(f);
  });

  return final;
};

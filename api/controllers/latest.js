'use strict';

var _ = require('lodash');

var db = require('../services/db.js').db;

/**
* Get latest for all locations. Implements all protocols supported by /latest endpoint
*
* @param {Object} payload - Payload contains query paramters and their values
* @param {recordsCallback} cb - The callback that returns the records
*/
module.exports.query = function (payload, cb) {
  // Get the collection
  var c = db.collection('measurements');

  // Execute the search and return the result via callback
  c.aggregate(
    [
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
      return cb(err, docs, docs.length);
    });
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

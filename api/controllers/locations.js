'use strict';

var db = require('../services/db.js').db;

/**
* Query distinct Locations. Implements all protocols supported by /locations endpoint
*
* @param {Object} payload - Payload contains query paramters and their values
* @param {recordsCallback} cb - The callback that returns the records
*/
module.exports.query = function (payload, cb) {
  // Get the collection
  var c = db.collection('measurements');

  // Execute the search and return the result via callback
  c.aggregate(
    [{ '$group': {
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

      return cb(err, docs, docs.length);
    });
};

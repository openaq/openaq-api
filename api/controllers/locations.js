'use strict';

var _ = require('lodash');

var db = require('../services/db.js').db;

/**
* Query distinct Locations. Implements all protocols supported by /locations endpoint
*
* @param {Object} payload - Payload contains query paramters and their values
* @param {recordsCallback} cb - The callback that returns the records
*/
module.exports.query = function (payload, page, limit, cb) {
  // Get the collection
  var c = db.collection('measurements');

  //
  // Apply paging
  //
  var skip = limit * (page - 1);

  // Execute the search and return the result via callback
  // Actually wrapping two aggregations here to get the true count before
  // handling paging. This can probably be handled better if it becomes a
  // performance issue.
  c.aggregate(
    [{
      '$group': {
        '_id': { country: '$country', city: '$city', location: '$location' }
      }
    }]).toArray(function (err, docs) {
      if (err) {
        return cb(err);
      }

      var length = docs.length;
      c.aggregate(
        [{ '$group': {
          '_id': { country: '$country', city: '$city', location: '$location' },
          'count': { $sum: 1 },
          'sourceName': { $first: '$sourceName' },
          'firstUpdated': { $min: '$date' },
          'lastUpdated': { $max: '$date' },
          'parameters': { $addToSet: '$parameter' }
        }
        },
        { $sort: { '_id.country': 1, '_id.city': 1, '_id.location': 1 } }
        ], { skip: skip, limit: limit }).toArray(function (err, docs) {
          if (err) {
            return cb(err);
          }

          docs = groupResults(docs);
          return cb(err, docs, length);
        });
    });
};

/**
* This is a big ugly function to group the results from the db into something
* nicer for display.
*
* @param {Array} docs - The db aggregation results
*/
var groupResults = function (docs) {
  var grouped = {};
  _.forEach(docs, function (d) {
    var location = {
      location: d._id.location,
      count: d.count,
      firstUpdated: d.firstUpdated,
      lastUpdated: d.lastUpdated,
      parameters: d.parameters,
      sourceName: d.sourceName
    };
    var country = grouped[d._id.country];
    if (country) {
      // Country exists already
      var city = country.cities[d._id.city];
      if (city) {
        // City exists already, add location and update parent values
        city.locations.push(location);
        city.count += location.count;
        country.count += location.count;
        city.firstUpdated = (location.firstUpdated < city.firstUpdated) ? location.firstUpdated : city.firstUpdated;
        country.firstUpdated = (location.firstUpdated < country.firstUpdated) ? location.firstUpdated : country.firstUpdated;
        city.lastUpdated = (location.lastUpdated > city.lastUpdated) ? location.lastUpdated : city.lastUpdated;
        country.lastUpdated = (location.lastUpdated > country.lastUpdated) ? location.lastUpdated : country.lastUpdated;
        city.parameters = _.union(city.parameters, location.parameters);
        country.parameters = _.union(country.parameters, location.parameters);
      } else {
        // City doesn't exist yet
        country.cities[d._id.city] = {
          city: d._id.city,
          locations: [location],
          count: location.count,
          firstUpdated: location.firstUpdated,
          lastUpdated: location.lastUpdated,
          parameters: location.parameters
        };
      }
    } else {
      // Neither Country nor City exist yet
      grouped[d._id.country] = {
        country: d._id.country,
        cities: {},
        count: location.count,
        firstUpdated: location.firstUpdated,
        lastUpdated: location.lastUpdated,
        parameters: location.parameters
      };
      grouped[d._id.country].cities[d._id.city] = {
        city: d._id.city,
        locations: [location],
        count: location.count,
        firstUpdated: location.firstUpdated,
        lastUpdated: location.lastUpdated,
        parameters: location.parameters
      };
    }
  });

  // Turn the object into an array for output
  var final = [];
  _.forEach(grouped, function (g) {
    var finalCities = [];
    _.forEach(g.cities, function (c) {
      finalCities.push(c);
    });
    g.cities = finalCities;
    final.push(g);
  });

  return final;
};

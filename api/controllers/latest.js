'use strict';

import { filter, has, groupBy, forEach } from 'lodash';

import { db } from '../services/db';

var cacheName = 'LATEST';

/**
 * Query the database and recieve back somewhat aggregated results
 *
 * @params {function} cb Callback of form (err, results)
 */
export function queryDatabase (cb) {
  // Generate intermediate aggregated result
  let resultsQuery = db.select(db.raw('distinct on (location, city, parameter) location, city, country, parameter, value, unit, date_utc, ST_AsGeoJSON(coordinates) as coordinates from measurements order by location, city, parameter, date_utc desc'));
  resultsQuery.then((results) => {
    cb(null, results);
  })
  .catch((err) => {
    cb(err);
  });
}

/**
* Get latest for all locations. Implements all protocols supported by /latest endpoint
*
* @param {Object} query - Payload contains query paramters and their values
* @param {recordsCallback} cb - The callback that returns the records
*/
module.exports.query = function (query, redis, cb) {
  var sendResults = function (err, data) {
    cb(err, data, data.length);
  };

  // Check to see if we have the intermeditate aggregation result cached, use
  // if it's there
  if (redis.ready) {
    redis.get(cacheName, (err, reply) => {
      if (err) {
        console.error(err);
      } else if (reply) {
        // Wrap in a try catch because you can never be too careful
        try {
          let data = JSON.parse(reply);

          // Build specific result from aggregated data
          data = filterResultsForQuery(data, query);

          // Group the results to a nicer output
          data = groupResults(data);

          // Send back results
          return sendResults(null, data);
        } catch (e) {
          console.error(e);
        }
      }

      // If we're here, try a database query since Redis failed us, most likely
      // because the key was missing
      queryDatabase((err, results) => {
        if (err) {
          return sendResults(err);
        }

        // This data should be in the cache, so save it
        redis.set(cacheName, JSON.stringify(results), (err, res) => {
          if (err) {
            console.error(err);
          }

          console.info(`Saved Redis cache for ${cacheName} after it was missing.`);
        });

        // Build specific result from aggregated data
        results = filterResultsForQuery(results, query);

        // Group the results to a nicer output
        results = groupResults(results);

        // Send back results
        sendResults(null, results);
      });
    });
  } else {
    // Query database if we have no Redis connection or don't want to hit it
    queryDatabase((err, results) => {
      if (err) {
        return sendResults(err);
      }

      // Build specific result from aggregated data
      results = filterResultsForQuery(results, query);

      // Group the results to a nicer output
      results = groupResults(results);

      // Send back results
      sendResults(null, results);
    });
  }
};

/**
 * Filter over larger results set to get only get specific values if requested
 *
 * @param {array} results Results array from database query or cache
 * @param {object} query Query object from Hapi
 * @returns {array} An array of filtered results
 * @todo this could be better optimized for sure
 */
let filterResultsForQuery = function (results, query) {
  if (has(query, 'city')) {
    results = filter(results, (r) => {
      return r.city === query.city;
    });
  }
  if (has(query, 'country')) {
    results = filter(results, (r) => {
      return r.country === query.country;
    });
  }
  if (has(query, 'location')) {
    results = filter(results, (r) => {
      return r.location === query.location;
    });
  }
  if (has(query, 'parameter')) {
    results = filter(results, (r) => {
      return r.parameter === query.parameter;
    });
  }
  if (has(query, 'has_geo')) {
    if (query.has_geo === false || query.has_geo === 'false') {
      results = filter(results, (r) => {
        return r.coordinates === undefined;
      });
    } else {
      results = filter(results, (r) => {
        return r.coordinates !== undefined;
      });
    }
  }

  return results;
};

/**
* This is a big ugly function to group the results from the db into something
* nicer for display.
*
* @param {Array} results - The db aggregation results
*/
let groupResults = function (results) {
  let grouped = groupBy(results, 'location');
  let final = [];
  forEach(grouped, function (m) {
    let measurements = m.map((m) => {
      return {
        parameter: m.parameter,
        value: m.value,
        lastUpdated: m.date_utc,
        unit: m.unit
      };
    });
    let f = {
      location: m[0].location,
      city: m[0].city,
      country: m[0].country,
      measurements: measurements
    };

    // If we have coordinates, add them
    if (m[0].coordinates) {
      f.coordinates = {
        longitude: JSON.parse(m[0].coordinates).coordinates[0],
        latitude: JSON.parse(m[0].coordinates).coordinates[1]
      };
    }

    final.push(f);
  });

  return final;
};

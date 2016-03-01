'use strict';

import { filter, has, groupBy, forEach, unique } from 'lodash';

import { db } from '../services/db';
import { AggregationEndpoint } from './base';

// Generate intermediate aggregated result
let resultsQuery = db.select(db.raw('location, city, parameter, source_name, country, count(value), max(date_utc) as last_updated, min(date_utc) as first_updated, ST_AsGeoJSON(coordinates) as coordinates from measurements group by location, city, parameter, source_name, ST_AsGeoJSON(coordinates), country'));

// Create the endpoint from the class
let locations = new AggregationEndpoint('LOCATIONS', resultsQuery, filterResultsForQuery, groupResults);

/**
 * Query the database and recieve back somewhat aggregated results
 *
 * @params {function} cb Callback of form (err, results)
 */
export function queryDatabase (cb) {
  locations.queryDatabase(cb);
}

/**
* Query distinct Locations. Implements all protocols supported by /locations endpoint
*
* @param {Object} query - Payload contains query paramters and their values
* @param {integer} page - Page number
* @param {integer} limit - Items per page
* @param {recordsCallback} cb - The callback that returns the records
*/
module.exports.query = function (query, page, limit, cb) {
  locations.query(query, page, limit, cb);
};

/**
 * Filter over larger results set to get only get specific values if requested
 *
 * @param {array} results Results array from database query or cache
 * @param {object} query Query object from Hapi
 * @returns {array} An array of filtered results
 * @todo this could be better optimized for sure
 */
function filterResultsForQuery (results, query) {
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
}

/**
* This is a big ugly function to group the results from the db into something
* nicer for display.
*
* @param {Array} results - The db aggregation results
*/
function groupResults (results) {
  let grouped = groupBy(results, 'location');
  let final = [];
  forEach(grouped, (m) => {
    let parameters = [];
    let lastUpdated = m[0].last_updated;
    let firstUpdated = m[0].first_updated;
    let count = 0;
    m.forEach((item) => {
      // Get each parameter
      parameters.push(item.parameter);

      // Get the absolute first and last dates
      firstUpdated = (item.first_updated < firstUpdated) ? item.first_updated : firstUpdated;
      lastUpdated = (item.last_updated > lastUpdated) ? item.last_updated : lastUpdated;

      // Sum up value counts
      count += Number(item.count);
    });
    let f = {
      location: m[0].location,
      city: m[0].city,
      country: m[0].country,
      sourceName: m[0].source_name,
      count: count,
      lastUpdated: lastUpdated,
      firstUpdated: firstUpdated,
      parameters: unique(parameters)
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
}

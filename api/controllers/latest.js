'use strict';

import { filter, has, groupBy, forEach } from 'lodash';

import { db } from '../services/db';
import { AggregationEndpoint } from './base';

// Generate intermediate aggregated result
let resultsQuery = db.select(db.raw('distinct on (location, city, parameter) location, city, country, parameter, value, unit, date_utc, ST_AsGeoJSON(coordinates) as coordinates from measurements order by location, city, parameter, date_utc desc'));

// Create the endpoint from the class
let latest = new AggregationEndpoint('LATEST', resultsQuery, filterResultsForQuery, groupResults);

/**
 * Query the database and recieve back somewhat aggregated results
 *
 * @params {function} cb Callback of form (err, results)
 */
export function queryDatabase (cb) {
  latest.queryDatabase(cb);
}

/**
* Get latest for all locations. Implements all protocols supported by /latest endpoint
*
* @param {Object} query - Payload contains query paramters and their values
* @param {recordsCallback} cb - The callback that returns the records
*/
export function query (query, cb) {
  latest.query(query, cb);
}

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
}

'use strict';

import { filter, has, groupBy, forEach, uniq, isArray, uniqBy, sortBy } from 'lodash';
import distance from 'turf-distance';
import point from 'turf-point';

import { db } from '../services/db';
import { AggregationEndpoint } from './base';
import { isGeoPayloadOK } from '../../lib/utils';
import { defaultGeoRadius } from '../constants';

// Generate intermediate aggregated result
const resultsQuery = db.select(db.raw('* from measurements join (select max(date_utc) last_updated, min(date_utc) first_updated, count(date_utc), location, city, parameter, source_name from measurements group by location, city, parameter, source_name) temp on measurements.location = temp.location and measurements.city = temp.city and measurements.parameter = temp.parameter and measurements.date_utc = last_updated'));

// Query to see if aggregation is active
const activeQuery = db.select(db.raw(`* from pg_stat_activity where state = 'active' and query = '${resultsQuery.toString()}'`));

// Create the endpoint from the class
const locations = new AggregationEndpoint('LOCATIONS', resultsQuery, activeQuery, handleDataMapping, filterResultsForQuery, groupResults, 'location');

/**
 * Query the database and recieve back somewhat aggregated results
 *
 * @params {function} cb Callback of form (err, results)
 */
export function queryDatabase (cb) {
  locations.queryDatabase(cb);
}

/**
 * Query the database to see if aggregation is still active
 *
 * @params {function} cb Callback of form (err, tf)
 */
export function isActive (cb) {
  locations.isActive(cb);
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
 * A function to handle mapping db results to useful data
 *
 * @param {array} results A results array from db
 * return {array} An array of modified results, useful to the system
 */
function handleDataMapping (results) {
  // Do a top level pass to handle some data transformation
  results = results.map((r) => {
    let o = {
      location: r.location,
      city: r.city,
      country: r.country,
      parameter: r.parameter,
      count: r.count,
      last_updated: r.last_updated,
      first_updated: r.first_updated,
      source_name: r.data.sourceName
    };

    if (r.data.coordinates) {
      o.coordinates = r.data.coordinates;
    }

    return o;
  });

  return results;
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
  // A comparison function to check for matches for array and strings, a bit different
  // than lodash's includes() since we look for exact string match
  const compare = function (collection, value) {
    if (isArray(collection)) {
      for (let i = 0; i < collection.length; i++) {
        if (collection[i] === value) {
          return true;
        }
      }
      return false;
    } else {
      return collection === value;
    }
  };
  if (has(query, 'city')) {
    results = filter(results, (r) => compare(query.city, r.city));
  }
  if (has(query, 'country')) {
    results = filter(results, (r) => compare(query.country, r.country));
  }
  if (has(query, 'location')) {
    results = filter(results, (r) => compare(query.location, r.location));
  }
  if (has(query, 'parameter')) {
    results = filter(results, (r) => compare(query.parameter, r.parameter));
  }
  if (has(query, 'has_geo')) {
    if (query.has_geo === false || query.has_geo === 'false') {
      results = filter(results, (r) => !r.coordinates);
    } else {
      results = filter(results, (r) => !!r.coordinates);
    }
  }
  if (has(query, 'coordinates')) {
    // Make sure geo payload is ok first
    if (isGeoPayloadOK(query)) {
      // Branch here depending on whether it's a radius or nearest search,
      // let nearest win if it's present
      if (has(query, 'nearest')) {
        // Sort results by distance from coordinates, first filter out measurements
        // without coordinates
        results = filter(results, 'coordinates');
        results = sortBy(results, (r) => {
          const p1 = point([r.coordinates.longitude, r.coordinates.latitude]);
          const p2 = point([Number(query.coordinates.split(',')[1]), Number(query.coordinates.split(',')[0])]);
          const d = distance(p1, p2, 'kilometers') * 1000; // convert to meters
          r.distance = d;
          return d;
        });

        // A little magic here to make sure when things are grouped by location,
        // we have the desired number of locations
        let grouped = [];
        results.forEach((r) => {
          if (uniqBy(grouped, 'location').length < query.nearest) {
            grouped.push(r);
          }
        });
        results = grouped;
      } else {
        // Look for custom radius
        let radius = defaultGeoRadius;
        if (has(query, 'radius')) {
          radius = query.radius;
        }
        results = filter(results, (r, i) => {
          if (!r.coordinates) {
            return false;
          }
          const p1 = point([r.coordinates.longitude, r.coordinates.latitude]);
          const p2 = point([Number(query.coordinates.split(',')[1]), Number(query.coordinates.split(',')[0])]);
          const d = distance(p1, p2, 'kilometers') * 1000; // convert to meters
          return d <= radius;
        });
      }
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
      count: count,
      sourceNames: uniqBy(m, 'source_name').map((u) => { return u.source_name; }),
      lastUpdated: lastUpdated,
      firstUpdated: firstUpdated,
      parameters: uniq(parameters)
    };

    // If we have distance, add it to be nice
    if (m[0].distance) {
      f.distance = Number(m[0].distance.toFixed(0));
    }

    // For sourceName, use the latest measurement to get the source
    // https://github.com/openaq/openaq.org/issues/137
    m.forEach((item) => {
      if (item.last_updated === lastUpdated) {
        f.sourceName = item.source_name;
      }
    });

    // If we have coordinates, add them
    if (m[0].coordinates) {
      f.coordinates = m[0].coordinates;
    }

    final.push(f);
  });

  return final;
}

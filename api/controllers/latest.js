'use strict';

import { filter, has, groupBy, forEach } from 'lodash';
import distance from 'turf-distance';
import point from 'turf-point';

import { db } from '../services/db';
import { AggregationEndpoint } from './base';
import { isGeoPayloadOK, hiveObjParse } from '../../lib/utils';
import { defaultGeoRadius } from '../constants';
import client from '../services/athena';

// Generate intermediate aggregated result
var resultsQuery = db.select(db.raw('* from measurements join (select max(date_utc) max_date, location, city, parameter from measurements group by location, city, parameter) temp on measurements.location = temp.location and measurements.city = temp.city and measurements.parameter = temp.parameter and measurements.date_utc = max_date'));

// Query to see if aggregation is active
var activeQuery = db.select(db.raw(`* from pg_stat_activity where state = 'active' and query = '${resultsQuery.toString()}'`));

/**
 * A function to handle mapping db results to useful data
 *
 * @param {array} results A results array from db
 * return {array} An array of modified results, useful to the system
 */
var handleDataMapping = (results) => {
  // Do a top level pass to handle some data transformation
  results = results.map((r) => {
    let o = {
      location: r.location,
      city: r.city,
      country: r.country,
      parameter: r.parameter,
      value: r.value,
      unit: r.unit,
      date_utc: r.date_utc,
      source_name: r.source_name,
      averagingPeriod: r.data.averagingPeriod
    };

    if (r.data.coordinates) {
      o.coordinates = r.data.coordinates;
    }

    return o;
  });

  return results;
};

if (process.env.USE_ATHENA) {
  const query = `select * from ${client.fetchesTable} as db join ` +
  `(select max(from_iso8601_timestamp(date.utc)) max_date, location, city, parameter from ${client.fetchesTable} ` +
  'group by location, city, parameter) as temp ' +
  'on db.location = temp.location ' +
  'and db.city = temp.city ' +
  'and db.parameter = temp.parameter ' +
  'and from_iso8601_timestamp(db.date.utc) = max_date';

  resultsQuery = client.query(query);
  activeQuery = resultsQuery.activeQuery();

  handleDataMapping = (results) => {
    results = results.map((r) => {
      let o = {
        location: r.location,
        city: r.city,
        country: r.country,
        parameter: r.parameter,
        value: Number(r.value),
        unit: r.unit,
        date_utc: hiveObjParse(r.date).utc,
        source_name: r.sourcename
      };

      if (r.averagingperiod) {
        let ap = hiveObjParse(r.averagingperiod);
        o.averagingPeriod = {value: Number(ap.value), unit: ap.unit};
      }

      if (r.coordinates) {
        let coordsObj = hiveObjParse(r.coordinates);
        o.coordinates = {
          latitude: Number(coordsObj.latitude),
          longitude: Number(coordsObj.longitude)
        };
      }

      return o;
    });

    return results;
  };
}

// Create the endpoint from the class
const latest = new AggregationEndpoint('LATEST', resultsQuery, activeQuery, handleDataMapping, filterResultsForQuery, groupResults, 'location');

/**
 * Query the database and recieve back somewhat aggregated results
 *
 * @params {function} cb Callback of form (err, results)
 */
export function queryDatabase (cb) {
  latest.queryDatabase(cb);
}

/**
 * Query the database to see if aggregation is still active
 *
 * @params {function} cb Callback of form (err, tf)
 */
export function isActive (cb) {
  latest.isActive(cb);
}

/**
* Get latest for all locations. Implements all protocols supported by /latest endpoint
*
* @param {Object} query - Payload contains query paramters and their values
* @param {integer} page - Page number
* @param {integer} limit - Items per page
* @param {recordsCallback} cb - The callback that returns the records
*/
export function query (query, page, limit, cb) {
  latest.query(query, page, limit, cb);
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
        return !r.coordinates;
      });
    } else {
      results = filter(results, (r) => {
        return !!r.coordinates;
      });
    }
  }
  if (has(query, 'coordinates')) {
    // Make sure geo payload is ok first
    if (isGeoPayloadOK(query)) {
      // Look for custom radius
      let radius = defaultGeoRadius;
      if (has(query, 'radius')) {
        radius = query.radius;
      }
      results = filter(results, 'coordinates');
      results = results.map((r, i) => {
        const p1 = point([r.coordinates.longitude, r.coordinates.latitude]);
        const p2 = point([Number(query.coordinates.split(',')[1]), Number(query.coordinates.split(',')[0])]);
        const d = distance(p1, p2, 'kilometers') * 1000; // convert to meters
        r.distance = d;
        return r;
      });
      results = filter(results, (r, i) => {
        return r.distance <= radius;
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
        unit: m.unit,
        sourceName: m.source_name,
        averagingPeriod: m.averagingPeriod
      };
    });
    let f = {
      location: m[0].location,
      city: m[0].city,
      country: m[0].country,
      distance: m[0].distance,
      measurements: measurements
    };

    // If we have coordinates, add them
    if (m[0].coordinates) {
      f.coordinates = m[0].coordinates;
    }

    final.push(f);
  });

  return final;
}

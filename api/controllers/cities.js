'use strict';

import { filter, has } from 'lodash';

import { db } from '../services/db';
import { AggregationEndpoint } from './base';

// Generate intermediate aggregated result
let resultsQuery = db
                      .from('measurements')
                      .select('city', 'country')
                      .count('value')
                      .select(db.raw('count(distinct location) as locations'))
                      .groupBy('city', 'country');

// Create the endpoint from the class
let cities = new AggregationEndpoint('CITIES', resultsQuery, filterResultsForQuery, groupResults);

/**
 * Query the database and recieve back somewhat aggregated results
 *
 * @params {function} cb Callback of form (err, results)
 */
export function queryDatabase (cb) {
  cities.queryDatabase(cb);
}

/**
* Query distinct cities. Implements all protocols supported by /cities endpoint
*
* @param {Object} query - Payload contains query paramters and their values
* @param {recordsCallback} cb - The callback that returns the records
*/
export function query (query, cb) {
  cities.query(query, cb);
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
  if (has(query, 'country')) {
    results = filter(results, (r) => {
      return r.country === query.country;
    });
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
  // Convert numbers to Numbers
  return results.map((r) => {
    r.locations = Number(r.locations);
    r.count = Number(r.count);

    return r;
  });
}

'use strict';

import { filter, has } from 'lodash';

import { db } from '../services/db';
import { AggregationEndpoint } from './base';

// Generate intermediate aggregated result
let resultsQuery = db
                      .from('measurements')
                      .select('country', 'source_name as sourceName')
                      .select(db.raw('count(distinct location) as locations'))
                      .count('value')
                      .orderBy('country')
                      .groupBy('country', 'sourceName');

// Create the endpoint from the class
let sources = new AggregationEndpoint('SOURCES', resultsQuery, filterResultsForQuery, groupResults);

/**
 * Query the database and recieve back somewhat aggregated results
 *
 * @params {function} cb Callback of form (err, results)
 */
export function queryDatabase (cb) {
  sources.queryDatabase(cb);
}

/**
* Query distinct sources. Implements all protocols supported by /sources endpoint
*
* @param {Object} query - Payload contains query paramters and their values
* @param {recordsCallback} cb - The callback that returns the records
*/
export function query (query, redis, cb) {
  sources.query(query, redis, cb);
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

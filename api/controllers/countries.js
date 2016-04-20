'use strict';

import { prettyCountryName } from '../../lib/utils';
import { db } from '../services/db';

import { AggregationEndpoint } from './base';

// Generate intermediate aggregated result
let resultsQuery = db
                    .from('measurements')
                    .select('country')
                    .count('value')
                    .select(db.raw('count(distinct city) as cities'))
                    .select(db.raw('count(distinct location) as locations'))
                    .groupBy('country')
                    .orderBy('country');

// Create the endpoint from the class
let countries = new AggregationEndpoint('COUNTRIES', resultsQuery, filterResultsForQuery, groupResults);

/**
 * Query the database and recieve back somewhat aggregated results
 *
 * @params {function} cb Callback of form (err, results)
 */
export function queryDatabase (cb) {
  countries.queryDatabase(cb);
}

/**
* Query distinct countries. Implements all protocols supported by /countries endpoint
*
* @param {Object} query - Payload contains query paramters and their values
* @param {integer} page - Page number
* @param {integer} limit - Items per page
* @param {recordsCallback} cb - The callback that returns the records
*/
export function query (query, page, limit, cb) {
  countries.query(query, page, limit, cb);
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
  // Currently not implemented but leaving in here for controller consistency

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
    r.count = Number(r.count);
    r.cities = Number(r.cities);
    r.locations = Number(r.locations);
    r.code = r.country;
    r.name = prettyCountryName(r.code);
    delete r.country;

    return r;
  });
}

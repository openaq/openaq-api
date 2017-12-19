'use strict';

import { prettyCountryName } from '../../lib/utils';
import { db } from '../services/db';
import { groupBy, uniqBy } from 'lodash';

import { AggregationEndpoint } from './base';
import client from '../services/athena';

// Generate intermediate aggregated result
var resultsQuery = db
                    .from('measurements')
                    .select(['UPPER(country)', 'city', 'location'])
                    .count('location')
                    .groupBy(['UPPER(country)', 'location', 'city'])
                    .orderBy('UPPER(country)');

// Query to see if aggregation is active
var activeQuery = db.select(db.raw(`* from pg_stat_activity where state = 'active' and query = '${resultsQuery.toString()}'`));
if (process.env.USE_ATHENA) {
  let query = `SELECT UPPER(country), city, location, count(location) as count from ${client.fetchesTable} GROUP BY UPPER(country), city, location ORDER BY UPPER(country)`;
  resultsQuery = client.query(query);
  activeQuery = resultsQuery.activeQuery();
}

// Create the endpoint from the class
const countries = new AggregationEndpoint('COUNTRIES', resultsQuery, activeQuery, handleDataMapping, filterResultsForQuery, groupResults, 'name');

/**
 * Query the database and recieve back somewhat aggregated results
 *
 * @params {function} cb Callback of form (err, results)
 */
export function queryDatabase (cb) {
  countries.queryDatabase(cb);
}

/**
 * Query the database to see if aggregation is still active
 *
 * @params {function} cb Callback of form (err, tf)
 */
export function isActive (cb) {
  countries.isActive(cb);
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
 * A function to handle mapping db results to useful data
 *
 * @param {array} results A results array from db
 * return {array} An array of modified results, useful to the system
 */
function handleDataMapping (results) {
  // Nothing to do here
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
  // Currently not implemented but leaving in here for controller consistency

  return results;
}

/**
* Group the results from the db into something
* nicer for display.
*
* @param {Array} results - The db aggregation results
* @return {Array} An array of grouped and processed results
*/
function groupResults (results) {
  let final = [];
  const grouped = groupBy(results, 'country');
  Object.keys(grouped).forEach((key) => {
    // Get uniques of cities and locations
    const cities = uniqBy(grouped[key], (loc) => {
      return loc.city;
    });
    const locations = uniqBy(grouped[key], (loc) => {
      return loc.location;
    });

    // And loop over all items to get total count
    let count = 0;
    grouped[key].forEach((loc) => {
      count += Number(loc.count);
    });

    final.push({
      name: prettyCountryName(key),
      code: key,
      cities: cities.length,
      locations: locations.length,
      count: count
    });
  });
  return final;
}

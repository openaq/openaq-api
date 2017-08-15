'use strict';

import { filter, has, groupBy, uniq } from 'lodash';

import { db } from '../services/db';
import { AggregationEndpoint } from './base';

// Generate intermediate aggregated result
let resultsQuery = db
                    .from('measurements')
                    .select(['country', 'city', 'location'])
                    .count('location')
                    .groupBy(['country', 'location', 'city'])
                    .orderBy('country');

// Create the endpoint from the class, purposefully using a different cache
// name here since we can reuse the data from the countries query
let cities = new AggregationEndpoint('COUNTRIES', resultsQuery, null, handleDataMapping, filterResultsForQuery, groupResults, 'country');

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
* @param {integer} page - Page number
* @param {integer} limit - Items per page
* @param {recordsCallback} cb - The callback that returns the records
*/
export function query (query, page, limit, cb) {
  cities.query(query, page, limit, cb);
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
  if (has(query, 'country')) {
    results = filter(results, (r) => {
      return r.country === query.country;
    });
  }

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
    // Get uniques of cities
    const cityGrouped = groupBy(grouped[key], 'city');

    // Now for each city in the country, calculate numbers. Need to do it this
    // way since there is overlap in city names.
    Object.keys(cityGrouped).forEach((key) => {
      const locations = uniq(cityGrouped[key], (loc) => {
        return loc.location;
      });

      // And loop over all items to get total count
      let count = 0;
      cityGrouped[key].forEach((loc) => {
        count += Number(loc.count);
      });

      final.push({
        city: key,
        country: cityGrouped[key][0].country,
        locations: locations.length,
        count: count
      });
    });
  });

  return final;
}

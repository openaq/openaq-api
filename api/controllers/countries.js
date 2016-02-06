'use strict';

import { prettyCountryName } from '../../lib/utils';
import { db } from '../services/db';

var cacheName = 'COUNTRIES';

/**
 * Query the database and recieve back somewhat aggregated results
 *
 * @params {function} cb Callback of form (err, results)
 */
export function queryDatabase (cb) {
  // Generate intermediate aggregated result
  let resultsQuery = db
                      .from('measurements')
                      .select('country')
                      .count('value')
                      .groupBy('country');

  resultsQuery.then((results) => {
    cb(null, results);
  })
  .catch((err) => {
    cb(err);
  });
}

/**
* Query distinct countries. Implements all protocols supported by /countries endpoint
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
            console.log(err);
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
  // Currently not implemented but leaving in here for controller consistency

  return results;
};

/**
* This is a big ugly function to group the results from the db into something
* nicer for display.
*
* @param {Array} results - The db aggregation results
*/
let groupResults = function (results) {
  // Convert numbers to Numbers
  return results.map((r) => {
    r.count = Number(r.count);
    r.code = r.country;
    r.name = prettyCountryName(r.code);
    delete r.country;

    return r;
  });
};

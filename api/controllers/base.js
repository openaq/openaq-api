'use strict';

import { slice } from 'lodash';

import { log } from '../services/logger';
import redis from '../services/redis';

/**
 * Generic base class for aggregation endpoints, provides a mechanism to
 * handle querying and filtering via API from cache as well as unfiltered
 * database access to generate cache.
 *
 * @param {string} cacheName Name of cache key
 * @param {object} resultsQuery A knex generated db query
 * @param {function} filterResultsForQuery A function to filter returned results
 * @param {function} groupResults A function to group returned results
 */
export class AggregationEndpoint {
  constructor (cacheName, resultsQuery, filterResultsForQuery, groupResults) {
    this.cacheName = cacheName;
    this.resultsQuery = resultsQuery;
    this.filterResultsForQuery = filterResultsForQuery;
    this.groupResults = groupResults;
  }

  /**
   * Query the database and recieve back somewhat aggregated results
   *
   * @params {function} cb Callback of form (err, results)
   */
  queryDatabase (cb) {
    this.resultsQuery.then((results) => {
      cb(null, results);
    })
    .catch((err) => {
      cb(err);
    });
  }

  /**
  * Query distinct cities. Implements all protocols supported by /cities endpoint
  *
  * @param {Object} query - Payload contains query paramters and their values
  * @param {integer} page - Page number
  * @param {integer} limit - Items per page
  * @param {recordsCallback} cb - The callback that returns the records
  */
  query (query, page, limit, cb) {
    var sendResults = function (err, data) {
      var paged = slice(data, (page - 1) * limit, page * limit);
      cb(err, paged, data.length);
    };

    // Check to see if we have the intermeditate aggregation result cached, use
    // if it's there
    if (redis && redis.ready) {
      redis.get(this.cacheName, (err, reply) => {
        if (err) {
          log(['error'], err);
        } else if (reply) {
          // Wrap in a try catch because you can never be too careful
          try {
            let data = JSON.parse(reply);

            // Build specific result from aggregated data
            data = this.filterResultsForQuery(data, query);

            // Group the results to a nicer output
            data = this.groupResults(data);

            // Send back results
            return sendResults(null, data);
          } catch (e) {
            log(['error'], e);
          }
        }

        // If we're here, we tried to use Redis but it failed us, return an
        // error so we don't overload the database with aggregation queries
        return sendResults('No cached results available.');
      });
    } else {
      // Query database if we have no Redis connection or don't want to hit it
      this.queryDatabase((err, results) => {
        if (err) {
          return sendResults(err);
        }

        // Build specific result from aggregated data
        results = this.filterResultsForQuery(results, query);

        // Group the results to a nicer output
        results = this.groupResults(results);

        // Send back results
        sendResults(null, results);
      });
    }
  }
}

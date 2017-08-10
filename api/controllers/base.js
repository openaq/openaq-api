'use strict';

import { orderBy, slice } from 'lodash';

import { log } from '../services/logger';
import redis from '../services/redis';

/**
 * Generic base class for aggregation endpoints, provides a mechanism to
 * handle querying and filtering via API from cache as well as unfiltered
 * database access to generate cache.
 *
 * @param {string} cacheName Name of cache key
 * @param {object} resultsQuery A knex generated db query
 * @param {function} handleDataMapping A function to handle mapping db results to useful data
 * @param {function} filterResultsForQuery A function to filter returned results
 * @param {function} groupResults A function to group returned results
 * @param {string|list} defaultOrderByProperty Default ordering field
 */
export class AggregationEndpoint {
  constructor (cacheName, resultsQuery, activeQuery, handleDataMapping, filterResultsForQuery, groupResults, defaultOrderByProperty) {
    this.cacheName = cacheName;
    this.resultsQuery = resultsQuery;
    this.handleDataMapping = handleDataMapping;
    this.filterResultsForQuery = filterResultsForQuery;
    this.groupResults = groupResults;
    this.activeQuery = activeQuery;
    this.defaultOrderByProperty = defaultOrderByProperty;
  }

  /**
   * Query the database and receive back somewhat aggregated results
   *
   * @params {function} cb Callback of form (err, results)
   */
  queryDatabase (cb) {
    this.resultsQuery.then((results) => {
      results = this.handleDataMapping(results);
      cb(null, results);
    })
    .catch((err) => {
      cb(err);
    });
  }

  /**
   * Query the database to see if aggregation is active
   *
   * @params {function} cb Callback of form (err, tf)
   */
  isActive (cb) {
    this.activeQuery.then((results) => {
      const active = results.length !== 0;
      cb(null, active);
    })
    .catch((err) => {
      cb(err);
    });
  }

  /**
   * Order results after grouping them
   *
   * @param {array|string} results - The grouped results
   * @param {object} query - Query object from Hapi
   * @return {array} results - Ordered results
   */
  orderResults (results, query) {
    results = orderBy(results, query.order_by || this.defaultOrderByProperty, query.sort || 'asc');
    return results;
  }

  /**
  * Runs the query.
  *
  * @param {Object} query - Payload contains query parameters and their values
  * @param {integer} page - Page number
  * @param {integer} limit - Items per page
  * @param {recordsCallback} cb - The callback that returns the records
  */
  query (query, page, limit, cb) {
    var sendResults = function (err, data) {
      if (err) {
        return cb(err);
      }

      var paged = slice(data, (page - 1) * limit, page * limit);
      cb(null, paged, data.length);
    };

    // Check to see if we have the intermediate aggregation result cached, use
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
            data = this.orderResults(data, query);

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
        results = this.orderResults(results, query);

        // Send back results
        sendResults(null, results);
      });
    }
  }
}

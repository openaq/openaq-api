'use strict';

import { orderBy } from 'lodash';

import { db } from '../services/db';
var utils = require('../../lib/utils');

/**
* Query Fetches. Implements all protocols supported by /fetches endpoint
*
* @param {Object} query - Payload contains query paramters and their values
* @param {integer} page - Page number
* @param {integer} limit - Items per page
* @param {recordsCallback} cb - The callback that returns the records
*/
module.exports.query = function (query, page, limit, cb) {
  const orderByField = query.order_by;
  delete query.order_by;
  const sort = query.sort;
  delete query.sort;
  // Turn the payload into something we can use with psql
  let { payload, operators, betweens, nulls, notNulls } = utils.queryFromParameters(query);

  //
  // Apply paging
  //
  var skip = limit * (page - 1);

  //
  // Run the queries, first do a count for paging, then get results
  //
  let countQuery = db
                    .count('id')
                    .from('fetches');
  countQuery = utils.buildSQLQuery(countQuery, payload, operators, betweens, nulls, notNulls);
  countQuery.then((count) => {
    return Number(count[0].count); // PostgreSQL returns count as string
  })
  .then((count) => {
    // Base query
    let resultsQuery = db
                        .select(['time_started', 'time_ended', 'count', 'results'])
                        .from('fetches')
                        .orderBy('id', 'desc')
                        .limit(limit).offset(skip);
    // Build on base query
    resultsQuery = utils.buildSQLQuery(resultsQuery, payload, operators, betweens, nulls, notNulls);

    // Run the query
    resultsQuery.then((results) => {
      // Move data obj to top level and handle projections
      results = results.map((r) => {
        r.timeStarted = r.time_started;
        delete r.time_started;
        r.timeEnded = r.time_ended;
        delete r.time_ended;
        // TMP - ensure that detailed measurements are not returned
        // can be removed after fix for #351 is implemented in openaq-fetch
        if (r.results) {
          delete r.results;
        }
        return r;
      });
      results = orderBy(results, orderByField || 'timeStarted', sort || 'asc');
      return cb(null, results, count);
    })
      .catch((err) => {
        return cb(err);
      });
  })
  .catch((err) => {
    return cb(err);
  });
};

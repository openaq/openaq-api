'use strict';

import { forEach, has, omit, isEmpty, pick } from 'lodash';
import { db } from '../services/db';
import {
  buildLocationsWhere,
  buildSQLQuery,
  queryFromParameters
} from '../../lib/utils';

/**
 * Query Measurements just for count.
 *
 * @param {Object} query - Payload contains query parameters and their values
 * @param {Boolean} skipRedis - Should we check Redis for cached count value? Useful for forcing query from DB.
 * @param {countCallback} cb - The callback that returns the count
 */
const queryCount = function (query, cb) {
  // Check if query is contains parameter(s)
  const countByParameters = query.parameter && query.parameter.length > 0;

  // Create query
  let countQuery = db
    .select(countByParameters ? 'countsByMeasurement' : 'count')
    .from('locations')
    .where(buildLocationsWhere(query));

  // Aggregate counts before callback
  countQuery
    .then(counts => {
      let totalCount;

      // In query measurement parameters are passed
      if (countByParameters) {
        // Ensure query parameters is an array
        const queryParameters = [].concat(query.parameter);

        // Aggregate counts returned to a single number
        totalCount = counts.reduce((count, i) => {
          return (
            count +
            i.countsByMeasurement.reduce((pCount, p) => {
              // Only sum queries parameters (eg. co, no2)
              return (
                pCount + (queryParameters.includes(p.parameter) ? p.count : 0)
              );
            }, 0)
          );
        }, 0);
      } else {
        // No measurement parameters were passed, return total count
        totalCount = counts.reduce((count, i) => {
          return count + i.count;
        }, 0);
      }
      cb(null, totalCount);
    })
    .catch(err => {
      return cb(err);
    });
};

/**
 * Query Measurements. Implements all protocols supported by /measurements endpoint
 *
 * @param {Object} query - Payload contains query parameters and their values
 * @param {integer} page - Page number
 * @param {integer} limit - Items per page
 * @param {recordsCallback} cb - The callback that returns the records
 */
module.exports.query = function (query, page, limit, cb) {
  // Turn the payload into something we can use with psql
  let {
    payload,
    operators,
    betweens,
    nulls,
    notNulls,
    geo
  } = queryFromParameters(query);

  //
  // Handle include_fields cases
  //
  var projection = [
    'location',
    'parameter',
    'date',
    'value',
    'unit',
    'coordinates',
    'country',
    'city'
  ];

  if (has(payload, 'include_fields')) {
    // Turn into an array and add to projection
    var fields = payload.include_fields.split(',');
    forEach(fields, function (f) {
      projection.push(f);
    });

    // sanitized payload
    payload = omit(payload, 'include_fields');
  }

  //
  // Handle custom sorts, starting with default of most recent measurements first.
  //
  const defaultSort = [{ column: 'date_utc', direction: 'desc' }];
  let sort = [];
  if (has(payload, 'order_by')) {
    payload.order_by = [].concat(payload.order_by);
    if (has(payload, 'sort')) {
      payload.sort = [].concat(payload.sort);
    }
    payload.order_by.forEach((column, i, columns) => {
      // skip unknown columns
      if (projection.indexOf(column) === -1) {
        return;
      }

      // Catch case where order_by is provided as 'date'
      if (column === 'date') {
        column = 'date_utc';
      }
      if (column === 'sourceName') {
        column = 'source_name';
      }
      let direction;
      try {
        direction = payload.sort[i];
      } catch (err) {
        direction = 'asc';
      }
      sort.push({
        column: column,
        direction: direction
      });
    });

    // sanitized payload
    payload = omit(payload, 'order_by');
  }

  if (has(payload, 'sort')) {
    // sanitized payload
    payload = omit(payload, 'sort');
  }

  if (isEmpty(sort)) {
    sort = defaultSort;
  }

  //
  // Apply paging
  //
  var skip = limit * (page - 1);

  //
  // Run the queries, first do a count for paging, then get results
  //
  queryCount(query, (err, count) => {
    if (err) {
      return cb(err);
    }

    // Base query
    let resultsQuery = db
      .select('data')
      .from('measurements')
      .limit(limit)
      .offset(skip);
    sort.forEach(s => {
      resultsQuery = resultsQuery.orderBy(s.column, s.direction);
    });

    // Build on base query
    resultsQuery = buildSQLQuery(
      resultsQuery,
      payload,
      operators,
      betweens,
      nulls,
      notNulls,
      geo
    );

    // Run the query
    resultsQuery
      .then(results => {
        // Move data obj to top level and handle projections
        results = results.map(r => {
          r = r.data;
          return pick(r, projection);
        });
        return cb(null, results, count);
      })
      .catch(err => {
        return cb(err);
      });
  });
};

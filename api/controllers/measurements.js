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
 */
const queryCount = async function (query) {
  let totalCount;

  // Flag if query has "parameter" property defined.
  const countByParameters = query.parameter && query.parameter.length > 0;

  // Create query
  let counts = await db
    .select(countByParameters ? 'countsByMeasurement' : 'count')
    .from('locations')
    .where(buildLocationsWhere(query));

  // If querying by parameter, break down count per measurement
  if (countByParameters) {
    // Convert parameters to array, if string
    const queryParameters = [].concat(query.parameter);

    // Add values by parameter
    totalCount = counts.reduce((count, i) => {
      return (
        count +
        i.countsByMeasurement.reduce((pCount, p) => {
          // Filter by queried parameters
          return pCount + (queryParameters.includes(p.parameter) ? p.count : 0);
        }, 0)
      );
    }, 0);
  } else {
    // If no parameters were passed, return total count
    totalCount = counts.reduce((count, i) => {
      return count + i.count;
    }, 0);
  }

  return totalCount;
};

/**
 * Query Measurements. Implements all protocols supported by /measurements endpoint
 *
 * @param {Object} query - Payload contains query parameters and their values
 * @param {integer} page - Page number
 * @param {integer} limit - Items per page
 * @param {recordsCallback} cb - The callback that returns the records
 */
module.exports.query = async function (query, page, limit) {
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
  const count = await queryCount(query);

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
  return resultsQuery.then(records => {
    // Move data obj to top level and handle projections
    records = records.map(r => {
      r = r.data;
      return pick(r, projection);
    });
    return { records, count };
  });
};

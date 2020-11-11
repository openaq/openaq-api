'use strict';

import { forEach, has, omit, isEmpty, intersection, pick } from 'lodash';
import { db } from '../services/db';
import {
  buildLocationsWhere,
  buildSQLQuery,
  queryFromParameters
} from '../../lib/utils';

/**
 * Query row count via locations table.
 *
 * @param {Object} query - Payload contains query parameters and their values
 */
const queryCountViaLocations = async function (query) {
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
 * Query row count via measurements table.
 *
 * @param {Object} query - Payload contains query parameters and their values
 */
const queryCountViaMeasurements = async function (query) {
  // Omit query parameters that doesn't affect count
  query = omit(query, ['sort', 'limit', 'page', 'order_by', 'include_fields']);

  // Parse request as database query
  let {
    payload,
    operators,
    betweens,
    nulls,
    notNulls,
    geo
  } = queryFromParameters(query);

  // Get base db query
  let countQuery = db.count('location').from('measurements');

  // Apply parameters
  countQuery = buildSQLQuery(
    countQuery,
    payload,
    operators,
    betweens,
    nulls,
    notNulls,
    geo
  );

  // Return count
  return Number((await countQuery)[0].count);
};

/**
 * Query Measurements. Implements all protocols supported by /measurements endpoint
 *
 * @param {Object} query - Payload contains query parameters and their values
 * @param {integer} page - Page number
 * @param {integer} limit - Items per page
 */
module.exports.query = async function (query, page, limit) {
  /**
   * By default, affected rows count is fetched via locations table, which
   * includes full count history.
   *
   * When query filters by values or date, the count is fetched via
   * measurements table, which do not include full history.
   */
  let count;
  if (
    intersection(Object.keys(query), [
      'value_from',
      'value_to',
      'date_from',
      'date_to'
    ]).length > 0
  ) {
    count = await queryCountViaMeasurements(query);
  } else {
    count = await queryCountViaLocations(query);
  }

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
      
      if (column == 'date_utc') {
        var limiting_date = (direction == 'asc') ? 'date_from' : 'date_to';
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
  // Apply a date filter to add selectivity.
  // Knowing that there are a maximum of 600,000 records per day, we know 
  // the date range can safely be set without removing any rows.
  //
  let days = Math.ceil( ( limit + skip ) / 600000 );
  let seconds = days * 24 *3600;
  
  if (has(payload, 'date_to')){
    let dateTo = new Date(payload.date_to);
  } else {
    let dateTo = new Date.now();
  }
  if (has(payload, 'date_from')){
    let dateFrom = new Date(payload.date_from);
  } else {
    let dateFrom = new Date.parse('2018-01-01');
  }
  if (limiting_date == 'date_from') {
    dateFrom = dateTo - seconds;
    operators.push({
      column: 'date_utc',
      operator: '>=',
      value: dateFrom
    });
  } else {
    dateTo = dateFrom + seconds;
    operators.push({
      column: 'date_utc',
      operator: '<=',
      value: dateTo
    });
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
  return resultsQuery.then(records => {
    // Move data obj to top level and handle projections
    records = records.map(r => {
      r = r.data;
      return pick(r, projection);
    });
    return { records, count };
  });
};

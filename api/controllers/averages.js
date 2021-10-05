'use strict';

import { has, omit, isEmpty, pick } from 'lodash';
import { db } from '../services/db';
import {
    buildSQLQuery,
    queryFromParameters
} from '../../lib/utils';
import moment from 'moment';

/**
 * Query row count via locations table.
 *
 * @param {Object} query - Payload contains query parameters and their values
 */

/**
 * Query row count via measurements table.
 *
 * @param {Object} query - Payload contains query parameters and their values
 */


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
    'country',
    'city',
    'location',
    'coordinates',
    'parameter',
    'date',
    'average',
    'measurement_count',
    'unit'
  ];

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

    // Base query
  let resultsQuery = db
        .select('*')
        .from('averages')
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
      const coordinates = {
        longitude: Number(r.lon),
        latitude: Number(r.lat)
      };
      r.coordinates = coordinates;
      r.date = formatDate(payload.temporal, r.date_utc); // in DB, is local, should change to utc for now for simplicity
      return omit(pick(r, projection), pickSpatialParams(payload.spatial));
    });
    return { records, count };
  });
};

function formatDate (temporal, date) {
  switch (temporal) {
    case 'day':
      return moment(date).format('YYYY-MM-DD');
    case 'month':
      return moment(date).format('YYYY-MM');
    case 'year':
      return moment(date).format('YYYY');
    default:
      return date;
  }
}

function pickSpatialParams (spatial) {
  switch (spatial) {
    case 'city':
      return ['location', 'coordinates'];
    case 'country':
      return ['location', 'coordinates', 'city'];
    default:
      return [];
  }
}

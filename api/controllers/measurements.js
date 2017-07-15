'use strict';

var _ = require('lodash');

import { db } from '../services/db';
import redis from '../services/redis';
var utils = require('../../lib/utils');
import { log } from '../services/logger';

/**
* Query Measurements just for count.
*
* @param {Object} query - Payload contains query paramters and their values
* @param {Boolean} skipRedis - Should we check Redis for cached count value? Useful for forcing query from DB.
* @param {countCallback} cb - The callback that returns the count
*/
module.exports.queryCount = function (query, skipRedis = false, cb) {
  const queryDBCount = function (query, cb) {
    let { payload, operators, betweens, nulls, notNulls, geo } = utils.queryFromParameters(query);

    let countQuery = db
                      .count('location')
                      .from('measurements');
    countQuery = utils.buildSQLQuery(countQuery, payload, operators, betweens, nulls, notNulls, geo);
    countQuery.then((count) => {
      return cb(null, Number(count[0].count)); // PostgreSQL returns count as string
    })
    .catch((err) => {
      return cb(err);
    });
  };

  // Check to see if we should use Redis, fall back to DB query if there was an issue
  // Right now we only want to use Redis for total measurements, but this could be changed in the future for certain query combinations
  query = _.omit(query, ['sort', 'limit', 'page', 'order_by', 'include_fields']); // These items don't change returned count
  if (skipRedis === false && redis && redis.ready && _.isEqual(query, {})) {
    redis.get('COUNT', (err, count) => {
      if (err || count === null || count === undefined) {
        log(['error'], 'Failure to use cached records count.');
        return queryDBCount(query, cb);
      }

      // Got count from Redis
      return cb(null, Number(count));
    });
  } else {
    queryDBCount(query, cb);
  }
};

/**
* Query database to see if count aggregation is active
*
* @param {Object} query - Payload contains query paramters and their values
* @param {countCallback} cb - The callback that returns the count
*/
module.exports.isActive = function (query, cb) {
  let { payload, operators, betweens, nulls, notNulls, geo } = utils.queryFromParameters(query);

  let countQuery = db
                    .count('location')
                    .from('measurements');
  countQuery = utils.buildSQLQuery(countQuery, payload, operators, betweens, nulls, notNulls, geo);
  const activeQuery = db.select(db.raw(`* from pg_stat_activity where state = 'active' and query = '${countQuery.toString()}'`));
  activeQuery.then((results) => {
    const active = results.length !== 0;
    return cb(null, active);
  })
  .catch((err) => {
    return cb(err);
  });
};

/**
* Query Measurements. Implements all protocols supported by /measurements endpoint
*
* @param {Object} query - Payload contains query paramters and their values
* @param {integer} page - Page number
* @param {integer} limit - Items per page
* @param {recordsCallback} cb - The callback that returns the records
*/
module.exports.query = function (query, page, limit, cb) {
  // Turn the payload into something we can use with psql
  let { payload, operators, betweens, nulls, notNulls, geo } = utils.queryFromParameters(query);

  //
  // Handle include_fields cases
  //
  var projection = ['location', 'parameter', 'date', 'value', 'unit',
                    'coordinates', 'country', 'city'];

  if (_.has(payload, 'include_fields')) {
    // Turn into an array and add to projection
    var fields = payload.include_fields.split(',');
    _.forEach(fields, function (f) {
      projection.push(f);
    });

    // sanitized payload
    payload = _.omit(payload, 'include_fields');
  }

  //
  // Handle custom sorts, starting with default of most recent measurements
  // first. Do nothing if we don't have both sort and order_by.
  //
  var sort = { column: 'date_utc', direction: 'desc' };
  if (_.has(payload, 'sort') && _.has(payload, 'order_by')) {
    // Catch case where order_by is provided as 'date'
    if (payload.order_by === 'date') { payload.order_by = 'date_utc'; }

    // Custom sort, overwrite default
    sort = {
      column: payload.order_by,
      direction: payload.sort
    };

    // sanitized payload
    payload = _.omit(payload, 'sort');
    payload = _.omit(payload, 'order_by');
  } else if (_.has(payload, 'sort')) {
    // sanitized payload
    payload = _.omit(payload, 'sort');
  } else if (_.has(payload, 'order_by')) {
    // sanitized payload
    payload = _.omit(payload, 'order_by');
  }

  //
  // Apply paging
  //
  var skip = limit * (page - 1);

  //
  // Run the queries, first do a count for paging, then get results
  //
  module.exports.queryCount(query, false, (err, count) => {
    if (err) {
      return cb(err);
    }

    // Base query
    let resultsQuery = db
                        .select('data')
                        .from('measurements')
                        .limit(limit).offset(skip)
                        .orderBy(sort.column, sort.direction);
    // Build on base query
    resultsQuery = utils.buildSQLQuery(resultsQuery, payload, operators, betweens, nulls, notNulls, geo);

    // Run the query
    resultsQuery.then((results) => {
      // Move data obj to top level and handle projections
      results = results.map((r) => {
        r = r.data;
        return _.pick(r, projection);
      });
      return cb(null, results, count);
    })
    .catch((err) => {
      return cb(err);
    });
  });
};

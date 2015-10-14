'use strict';

var _ = require('lodash');

var db = require('../services/db.js').db;

/**
* Query Measurements. Implements all protocols supported by /measurements endpoint
*
* @param {Object} payload - Payload contains query paramters and their values
* @param {recordsCallback} cb - The callback that returns the records
*/
module.exports.query = function (payload, page, limit, cb) {
  // Get the collection
  var c = db.collection('measurements');

  //
  // Date ranges
  //
  if (_.has(payload, 'date_from')) {
    // Test to make sure the date is formatted correctly
    var fromDate = new Date(payload.date_from);
    if (!isNaN(fromDate.getTime())) {
      payload['date.utc'] = { $gte: new Date(payload.date_from) };
    }

    // sanitize payload
    payload = _.omit(payload, 'date_from');
  }
  if (_.has(payload, 'date_to')) {
    // Test to make sure the date is formatted correctly
    var toDate = new Date(payload.date_to);
    if (!isNaN(toDate.getTime())) {
      // Check if we already have a date set for $gte
      if (payload.date) {
        payload['date.utc']['$lte'] = new Date(payload.date_to);
      } else {
        payload['date.utc'] = { $lte: new Date(payload.date_to) };
      }
    }

    // sanitize payload
    payload = _.omit(payload, 'date_to');
  }

  //
  // Value ranges
  //
  if (_.has(payload, 'value_from')) {
    if (isNaN(Number(payload.value_from)) === false) {
      payload.value = { $gte: Number(payload.value_from) };
    }

    // sanitized payload
    payload = _.omit(payload, 'value_from');
  }

  if (_.has(payload, 'value_to')) {
    if (isNaN(Number(payload.value_to)) === false) {
      // Check if we already have a value set for $gte
      if (payload.value) {
        payload.value['$lte'] = Number(payload.value_to);
      } else {
        payload.value = { $lte: Number(payload.value_to) };
      }
    }

    // sanitized payload
    payload = _.omit(payload, 'value_to');
  }

  //
  // Handle include_fields cases
  //
  var projection = {
    location: 1,
    parameter: 1,
    date: 1,
    value: 1,
    unit: 1,
    coordinates: 1,
    country: 1,
    city: 1
  };
  if (_.has(payload, 'include_fields')) {
    // Turn into an array and add to projection
    var fields = payload.include_fields.split(',');
    _.forEach(fields, function (f) {
      projection[f] = 1;
    });

    // sanitized payload
    payload = _.omit(payload, 'include_fields');
  }

  //
  // Handle custom sorts, starting with default of most recent measurements
  // first. Do nothing if we don't have both sort and order_by.
  //
  var sort = { 'date.utc': -1 };
  if (_.has(payload, 'sort') && _.has(payload, 'order_by')) {
    // Custom sort, overwrite default
    sort = {};
    sort[payload.order_by] = (payload.sort === 'asc') ? 1 : -1;

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

  // Handle has_geo flag and only return measurements with coordinates
  if (_.has(payload, 'has_geo')) {
    payload['coordinates'] = { $exists: true };
    // sanitized payload
    payload = _.omit(payload, 'has_geo');
  }

  //
  // Apply paging
  //
  var skip = limit * (page - 1);

  // Execute the search and return the result via callback
  c.count(payload, function (err, count) {
    if (err) {
      return cb(err);
    }

    c.find(payload, projection, { skip: skip, limit: limit }).sort(sort).toArray(function (err, docs) {
      return cb(err, docs, count);
    });
  });
};

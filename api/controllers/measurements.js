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

  // Handle date ranges
  if (_.has(payload, 'date_from')) {
    // Test to make sure the date is formatted correctly
    var fromDate = new Date(payload.date_from);
    if (!isNaN(fromDate.getTime())) {
      payload.date = { $gte: new Date(payload.date_from) };
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
        payload.date['$lte'] = new Date(payload.date_to);
      } else {
        payload.date = { $lte: new Date(payload.date_to) };
      }
    }

    // sanitize payload
    payload = _.omit(payload, 'date_to');
  }

  // Handle custom sorts, starting with default of most recent measurements
  // first. Do nothing if we don't have both sort and order_by.
  var sort = { date: -1 };
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

  // Apply paging
  var skip = limit * (page - 1);

  // Execute the search and return the result via callback
  c.count(payload, function (err, count) {
    if (err) {
      return cb(err);
    }

    c.find(payload, { skip: skip, limit: limit }).sort(sort).toArray(function (err, docs) {
      return cb(err, docs, count);
    });
  });
};

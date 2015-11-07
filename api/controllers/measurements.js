'use strict';

var _ = require('lodash');
var ObjectID = require('mongodb').ObjectID;

var db = require('../services/db.js').db;
var utils = require('../../lib/utils');

/**
* Query Measurements. Implements all protocols supported by /measurements endpoint
*
* @param {Object} payload - Payload contains query paramters and their values
* @param {recordsCallback} cb - The callback that returns the records
*/
module.exports.query = function (payload, page, limit, cb) {
  // Get the collection
  var c = db.collection('measurements');

  // Turn the payload into something we can use with mongo
  payload = utils.queryFromParameters(payload);

  // Handle _id field
  if (_.has(payload, '_id')) {
    payload['_id'] = new ObjectID(payload['_id']);
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

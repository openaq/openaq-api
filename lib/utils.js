'user strict';

var _ = require('lodash');
var countries = require('./country-list');

exports.payloadToKey = function (namespace, payload) {
  //
  // Combine payload into one string to use as a cache key
  //
  var strings = [];
  _.forEach(payload, function (v, k) {
    strings.push(k + '=' + v);
  });
  var key = strings.join('&');

  return key ? namespace + '+' + key : namespace;
};

exports.queryFromParameters = function (payload) {
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
      if (payload['date.utc']) {
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

  // Be nice and catch things close to 'µg/m³'
  if (_.has(payload, 'unit')) {
    if (_.indexOf(['ug/m3', 'ug/m³', 'µg/m3'], payload['unit']) !== -1) {
      payload['unit'] = 'µg/m³';
    }
  }

  // Handle has_geo flag, default to true
  if (_.has(payload, 'has_geo')) {
    var exists = true;
    if (payload['has_geo'] === 'false') {
      exists = false;
    }
    payload['coordinates'] = { $exists: exists };
    // sanitized payload
    payload = _.omit(payload, 'has_geo');
  }

  return payload;
};

exports.prettyCountryName = function (country) {
  return _.result(_.find(countries, { 'Code': country }), 'Name');
};

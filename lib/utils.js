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

/**
 * Turn the API query into something a bit nicer for SQL
 * @param {object} payload The API query payload
 * @returns { object, object } A payload and operators object with changed data
 */
exports.queryFromParameters = function (payload) {
  let operators = [];
  let betweens = [];
  let nulls = [];
  let notNulls = [];

  //
  // Removing improper fields
  //
  let okFields = ['country', 'city', 'location', 'parameter', 'has_geo',
    'value_from', 'value_to', 'date_from', 'date_to', 'sort', 'order_by',
    'include_fields', 'limit', 'page', 'skip', 'format', 'unit'];
  payload = _.pick(payload, okFields);

  //
  // Date ranges
  //
  if (_.has(payload, 'date_from') && _.has(payload, 'date_to')) {
    let fromDate = new Date(payload.date_from);
    let toDate = new Date(payload.date_to);
    if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
      betweens.push({
        column: 'date_utc',
        range: [new Date(payload.date_from), new Date(payload.date_to)]
      });
    }

    // Santized payload
    payload = _.omit(payload, ['date_from', 'date_to']);
  } else if (_.has(payload, 'date_from')) {
    // Test to make sure the date is formatted correctly
    let fromDate = new Date(payload.date_from);
    if (!isNaN(fromDate.getTime())) {
      operators.push({
        column: 'date_utc',
        operator: '>=',
        value: new Date(payload.date_from)
      });
    }

    // sanitize payload
    payload = _.omit(payload, 'date_from');
  } else if (_.has(payload, 'date_to')) {
    // Test to make sure the date is formatted correctly
    let toDate = new Date(payload.date_to);
    if (!isNaN(toDate.getTime())) {
      operators.push({
        column: 'date_utc',
        operator: '<=',
        value: new Date(payload.date_to)
      });
    }

    // sanitize payload
    payload = _.omit(payload, 'date_to');
  }

  //
  // Value ranges
  //
  if (_.has(payload, 'value_from') && _.has(payload, 'value_to')) {
    if (isNaN(Number(payload.value_from)) === false &&
        isNaN(Number(payload.value_to)) === false) {
      betweens.push({
        column: 'value',
        range: [Number(payload.value_from), Number(payload.value_to)]
      });
    }

    // sanitized payload
    payload = _.omit(payload, ['value_from', 'value_to']);
  } else if (_.has(payload, 'value_from')) {
    if (isNaN(Number(payload.value_from)) === false) {
      operators.push({
        column: 'value',
        operator: '>=',
        value: Number(payload.value_from)
      });
    }

    // sanitized payload
    payload = _.omit(payload, 'value_from');
  } else if (_.has(payload, 'value_to')) {
    if (isNaN(Number(payload.value_to)) === false) {
      operators.push({
        column: 'value',
        operator: '<=',
        value: Number(payload.value_to)
      });
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

    if (exists) {
      notNulls.push({column: 'coordinates'});
    } else {
      nulls.push({column: 'coordinates'});
    }

    // sanitized payload
    payload = _.omit(payload, 'has_geo');
  }

  return { payload, operators, betweens, nulls, notNulls };
};

exports.prettyCountryName = function (country) {
  return _.result(_.find(countries, { 'Code': country }), 'Name');
};

/**
 * Builds up a Knex query object for PostgreSQL
 * @params {object} base The base query object
 * @params {object} payload Key:value queries
 * @params {array} operators Operator based queries like value >= 20
 * @params {array} betweens Between based queries like value between 20 and 100
 * @params {array} nulls Null based queries like value is null
 * @params {array} nulls NotNull based queries like value is not null
 * @return {object} A magical query with all the good stuff
 */
exports.buildSQLQuery = function (base, payload = {}, operators = [], betweens = [], nulls = [], notNulls = []) {
  // Add payload
  base = base.where(payload);

  // Handle any operator queries
  operators.forEach((o) => {
    base = base.where(o.column, o.operator, o.value);
  });

  // Handle any between queries
  betweens.forEach((b) => {
    base = base.whereBetween(b.column, b.range);
  });

  // Handle any exists queries
  notNulls.forEach((n) => {
    base = base.whereNotNull(n.column);
  });
  nulls.forEach((n) => {
    base = base.whereNull(n.column);
  });

  return base;
};

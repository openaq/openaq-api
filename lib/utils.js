'user strict';

import { forEach, pick, has, indexOf, isArray, omit, result, find, isFinite } from 'lodash';
import moment from 'moment';
import countries from './country-list';

export function payloadToKey (namespace, payload) {
  //
  // Combine payload into one string to use as a cache key
  //
  var strings = [];
  forEach(payload, function (v, k) {
    strings.push(k + '=' + v);
  });
  var key = strings.join('&');

  return key ? namespace + '+' + key : namespace;
}

/**
 * Turn the API query into something a bit nicer for SQL
 * @param {object} payload The API query payload
 * @returns { object, object } A payload and operators object with changed data
 */
export function queryFromParameters (payload) {
  let operators = [];
  let betweens = [];
  let nulls = [];
  let notNulls = [];
  let geo = {};

  //
  // Removing improper fields
  //
  let okFields = ['country', 'city', 'location', 'parameter', 'has_geo',
    'value_from', 'value_to', 'date_from', 'date_to', 'sort', 'order_by',
    'include_fields', 'limit', 'page', 'skip', 'format', 'unit',
    'coordinates', 'radius'];
  payload = pick(payload, okFields);

  //
  // Geo, coordinates is needed, radius is optional (defaults to 2500 meters)
  //
  if (has(payload, 'coordinates')) {
    // Make sure coordinates looks valid
    if (isGeoPayloadOK(payload)) {
      const split = payload.coordinates.split(',');
      geo.coordinates = {latitude: Number(split[0]), longitude: Number(split[1])};
      if (has(payload, 'radius')) {
        geo.radius = Number(payload.radius);
      } else {
        geo.radius = 2500;
      }
    }
  }
  // Santized payload
  payload = omit(payload, ['coordinates', 'radius']);

  //
  // Date ranges
  //
  if (has(payload, 'date_from') && has(payload, 'date_to')) {
    let fromDate = new Date(payload.date_from);
    let toDate = new Date(payload.date_to);
    if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
      betweens.push({
        column: 'date_utc',
        range: [new Date(payload.date_from), new Date(payload.date_to)]
      });
    }

    // Santized payload
    payload = omit(payload, ['date_from', 'date_to']);
  } else if (has(payload, 'date_from')) {
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
    payload = omit(payload, 'date_from');
  } else if (has(payload, 'date_to')) {
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
    payload = omit(payload, 'date_to');
  }

  //
  // Value ranges
  //
  if (has(payload, 'value_from') && has(payload, 'value_to')) {
    if (isNaN(Number(payload.value_from)) === false &&
        isNaN(Number(payload.value_to)) === false) {
      betweens.push({
        column: 'value',
        range: [Number(payload.value_from), Number(payload.value_to)]
      });
    }

    // sanitized payload
    payload = omit(payload, ['value_from', 'value_to']);
  } else if (has(payload, 'value_from')) {
    if (isNaN(Number(payload.value_from)) === false) {
      operators.push({
        column: 'value',
        operator: '>=',
        value: Number(payload.value_from)
      });
    }

    // sanitized payload
    payload = omit(payload, 'value_from');
  } else if (has(payload, 'value_to')) {
    if (isNaN(Number(payload.value_to)) === false) {
      operators.push({
        column: 'value',
        operator: '<=',
        value: Number(payload.value_to)
      });
    }

    // sanitized payload
    payload = omit(payload, 'value_to');
  }

  // Be nice and catch things close to 'µg/m³'
  if (has(payload, 'unit')) {
    if (indexOf(['ug/m3', 'ug/m³', 'µg/m3'], payload['unit']) !== -1) {
      payload['unit'] = 'µg/m³';
    }
  }

  // Handle has_geo flag, default to true
  if (has(payload, 'has_geo')) {
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
    payload = omit(payload, 'has_geo');
  }

  return { payload, operators, betweens, nulls, notNulls, geo };
}

export function prettyCountryName (country) {
  return result(find(countries, { 'Code': country }), 'Name');
}

/**
 * Builds up a Knex query object for PostgreSQL
 * @params {object} base The base query object
 * @params {object} payload Key:value queries
 * @params {array} operators Operator based queries like value >= 20
 * @params {array} betweens Between based queries like value between 20 and 100
 * @params {array} nulls Null based queries like value is null
 * @params {array} nulls NotNull based queries like value is not null
 * @params {object} geo Geo based queries
 * @return {object} A magical query with all the good stuff
 */
export function buildSQLQuery (base, payload = {}, operators = [], betweens = [], nulls = [], notNulls = [], geo) {
  // Remove parameter for now, to handle in a moment
  let parameter = payload.parameter;
  payload = omit(payload, 'parameter');

  // Add payload
  base = base.where(payload);

  // Handle parameter array query, if it's an array, do a grouped OR
  if (parameter) {
    if (isArray(parameter)) {
      base = base.where((q) => {
        parameter.forEach((p) => {
          q.orWhere({'parameter': p});
        });
      });
    } else {
      base = base.where({'parameter': parameter});
    }
  }

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

  // Handle any geos
  if (geo && geo.coordinates && geo.radius) {
    base.whereRaw(`ST_DWithin(coordinates, ST_MakePoint(${geo.coordinates.longitude}, ${geo.coordinates.latitude}), ${geo.radius})`);
  }

  return base;
}

/**
 * Takes a string of the form {key1=val1, key2=val2} and returns a JS Object
 * Only works for non-nested objects!
 */
export function hiveObjParse (hiveStr) {
  var obj = {};

  // Defaults
  hiveStr = hiveStr || '';
  hiveStr = hiveStr.replace(/\s/g, '');

  // Test if it's in the proper form
  if (/{(\w+=([^=,])+)(,(\w+=([^=,])+))*}/.test(hiveStr)) {
    hiveStr
      .replace(/{|}/g, '')
      .split(',')
      .map(part => part.split('='))
      .forEach(row => {
        obj[row[0]] = row[1];
      });
  }

  return obj;
}

/**
 * Takes a date string of the form YYYY-MM-DD HH:mm:ss.SSS UTC
 * and returns an ISO 8601 date
 *
 * @param {string} hiveStr
 * @return {string}
 */
export function hiveDateParse (hiveStr) {
  hiveStr = hiveStr.replace(/UTC/, 'Z');
  return moment(hiveStr).toISOString();
}

/**
 * Make sure the geo payload we're getting is acceptable. We need to have
 * coordinates and if we have radius, it needs to be a number.
 *
 */
export function isGeoPayloadOK (payload) {
  const split = isArray(payload.coordinates) ? payload.coordinates : payload.coordinates.split(',');
  if (split.length === 2 && split[0] !== '' && split[1] !== '' &&
    isFinite(Number(split[0])) && isFinite(Number(split[1]))) {
    if (has(payload, 'nearest') && !isFinite(Number(payload.nearest))) {
      return false;
    } else if (!has(payload, 'radius') ||
      (has(payload, 'radius') && isFinite(Number(payload.radius)))) {
      return true;
    }
  }

  return false;
}

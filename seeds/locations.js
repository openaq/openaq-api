const locations = require('../test/data/locations.json');

import {
  isNumber,
  pick
} from 'lodash';

exports.seed = async function (knex, Promise) {
  // Clean up locations table
  await knex('locations').del();

  const data = locations.map(loc => {
    // Pick allowed location properties
    let l = pick(loc, [
      'id',
      'cities',
      'city',
      'coordinates',
      'count',
      'country',
      'countsByMeasurement',
      'firstUpdated',
      'lastUpdated',
      'lat',
      'location',
      'locations',
      'lon',
      'parameters',
      'sourceName',
      'sourceNames',
      'sourceType',
      'sourceTypes'
    ]);

    // Generate WKT from coordinates, if available
    if (isNumber(l.coordinates.longitude) && isNumber(l.coordinates.latitude)) {
      l.coordinates = `POINT(${l.coordinates.longitude} ${l.coordinates.latitude})`;
    }

    return l;
  });

  // Create array of inserts tasks
  return knex.batchInsert('locations', data);
};

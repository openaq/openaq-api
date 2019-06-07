const locations = require('../test/data/locations.json');

import {
  isNumber,
  pick
} from 'lodash';

exports.seed = async function (knex, Promise) {
  // Clean up locations table
  await knex('locations').del();

  for (let l of locations) {
    // Generate WKT from coordinates, if available
    if (isNumber(l.coordinates.longitude) && isNumber(l.coordinates.latitude)) {
      l.coordinates = `POINT(${l.coordinates.longitude} ${l.coordinates.latitude})`;
    }

    // Pick allowed location properties
    l = pick(l, [
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
  }

  // Create array of inserts tasks
  let tasks = locations.map(m => {
    return knex('locations').insert(m);
  });

  // Handle all tasks
  return Promise.all(tasks);
};

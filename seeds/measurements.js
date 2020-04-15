import { assign } from 'lodash';
import { st } from '../api/services/db';
let measurements = require('../test/data/measurements.json');

let buildSQLObject = function (m) {
  let obj = {
    location: m.location,
    value: m.value,
    unit: m.unit,
    parameter: m.parameter,
    country: m.country,
    city: m.city,
    source_name: m.sourceName,
    date_utc: m.date.utc
  };
  // Copy object JSON to the data field
  obj.data = assign({}, m);
  // If we have coordinates, save them with postgis
  if (m.coordinates) {
    obj.coordinates = st.geomFromText(
      `Point(${m.coordinates.longitude} ${m.coordinates.latitude})`,
      4326
    );
  }

  return obj;
};

exports.seed = async function (knex, Promise) {
  // Clean up measurements table
  await knex('measurements').del();

  // Create array of inserts tasks
  let tasks = measurements.results.map(m => {
    let o = buildSQLObject(m);
    return knex('measurements').insert(o);
  });

  // Add deletion task first
  tasks.unshift(knex('measurements').del());

  // Handle all tasks
  return Promise.all(tasks);
};

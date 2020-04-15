const locations = require('../test/data/locations.json');
const { computeCompleteness } = require('../lib/location-metadata-schema');

exports.seed = async function (knex, Promise) {
  // Clear table
  await knex.delete().from('locations_metadata');
  await knex.raw('ALTER SEQUENCE locations_metadata_id_seq RESTART WITH 1');

  const userId = 'test|12345';

  let inserts = [];

  // For the first location let's insert a complete record
  const doc = {
    locationId: locations[0].id,
    userId,
    createdAt: locations[0].firstUpdated,
    data: {
      name: locations[0].sourceName,
      instruments: [
        {
          type: 'test-instrument',
          active: true,
          parameters: locations[0].countsByMeasurement.map(o => o.parameter),
          serialNumber: 'abc5',
          manufacturer: 'openaq',
          modelName: 'az-05',
          measurementStyle: 'automated',
          rawFrequency: 5000,
          reportingFrequency: 7500,
          calibrationProcedures: 'none',
          inletHeight: 1,
          activationDate: locations[0].firstUpdated
        }
      ],
      siteType: 'rural',
      sourceType: locations[0].sourceType,
      elevation: 12,
      activationDate: locations[0].firstUpdated,
      active: true,
      attribution: [
        {
          name: 'Open AQ',
          url: 'http://openaq.org'
        }
      ],
      coordinates: {
        latitude: locations[0].coordinates.latitude,
        longitude: locations[0].coordinates.longitude
      }
    }
  };
  inserts.push(Object.assign({}, doc, {
    completeness: computeCompleteness(doc.data)
  }));

  // For half the other locations, let's use the base minimum.
  for (let i = 1; i < Math.floor(locations.length / 2); i++) {
    const doc = {
      locationId: locations[i].id,
      userId,
      createdAt: locations[i].firstUpdated,
      data: {
        name: locations[i].sourceName,
        active: true,
        instruments: [
          {
            type: 'test-instrument',
            active: true,
            parameters: locations[i].countsByMeasurement.map(o => o.parameter),
            serialNumber: `num-${locations[i].id}`
          }
        ],
        siteType: ['rural', 'urban', 'suburban', 'unlabeled'][i % 4],
        activationDate: locations[i].firstUpdated
      }
    };
    inserts.push(Object.assign({}, doc, {
      completeness: computeCompleteness(doc.data)
    }));
  }

  await knex.batchInsert('locations_metadata', inserts);
};

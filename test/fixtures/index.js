import path from 'path';
import { readJson } from 'fs-extra';
import { db } from '../../api/services/db';
import {
  applyParametersMeta,
  reconcileLocationIds,
  upsertLocations,
  upsertCities
} from '../../api/services/athena-sync';
import { computeCompleteness } from '../../lib/location-metadata-schema';

/* global fixturesPath */

const scenarios = {
  /*
   *  Populate database with locations available in 2016
   */
  'locations-2016': async function () {
    // Clean up table locations
    await db.delete().from('locations');

    // Load athena data up to 2016
    const locationBaseDataQueryResults2016 = await readJson(
      path.join(fixturesPath, 'athena-query-results/locations-up-to-2016.json')
    );

    // Reconcile ids from existing locations
    let locations2016 = await reconcileLocationIds(
      locationBaseDataQueryResults2016
    );

    // Load parameter count query, from up to 2016
    const parametersQueryResults2016 = await readJson(
      path.join(fixturesPath, 'athena-query-results/parameters-up-to-2016.json')
    );

    // Apply parameters meta
    locations2016 = await applyParametersMeta(
      locations2016,
      parametersQueryResults2016
    );

    // Upsert locations
    await upsertLocations(locations2016);
  },

  /*
   *  Populate database with locations metadata
   */
  'locations-metadata': async function () {
    // Clear table
    await db.delete().from('locations_metadata');
    await db.raw('ALTER SEQUENCE locations_metadata_id_seq RESTART WITH 1');

    const userId = 'test|12345';
    const dateStart = (new Date('2019/01/01')).getTime();

    let inserts = [];
    for (let i = 0; i < 100; i++) {
      const doc = {
        // Ensure 2 entries per location.
        locationId: `GB-${Math.floor(i / 2) + 1}`,
        userId,
        createdAt: new Date(dateStart + i * 1000),
        data: {
          name: `meta-${i}`,
          instruments: [
            {
              type: 'test-instrument',
              active: true,
              parameters: ['03'],
              serialNumber: `abc${i}`
            }
          ],
          siteType: ['rural', 'urban', 'suburban', 'unlabeled'][Math.floor(i / 2) % 4],
          activationDate: new Date(dateStart + i * 86400000)
        }
      };
      inserts.push(Object.assign({}, doc, {
        completeness: computeCompleteness(doc.data)
      }));
    }

    // Include a complete one.
    const doc = {
      locationId: 'GB-10',
      userId,
      createdAt: '2019-02-02T00:00:00.000Z',
      data: {
        name: 'EEA Andorra',
        active: true,
        siteType: 'urban',
        elevation: 12,
        sourceType: 'government',
        attribution: [
          {
            url: 'http://openaq.org',
            name: 'Open AQ'
          }
        ],
        coordinates: {
          latitude: 42.50969,
          longitude: 1.53914
        },
        instruments: [
          {
            type: 'test-instrument',
            active: true,
            modelName: 'az-05',
            parameters: [
              'co'
            ],
            inletHeight: 1,
            manufacturer: 'openaq',
            rawFrequency: 5000,
            serialNumber: 'abc5',
            activationDate: '2017-09-13T21:00:00.000Z',
            measurementStyle: 'automated',
            reportingFrequency: 7500,
            calibrationProcedures: 'none'
          }
        ],
        activationDate: '2017-09-13T21:00:00.000Z'
      }
    };
    inserts.push(Object.assign({}, doc, {
      completeness: computeCompleteness(doc.data)
    }));

    await db.batchInsert('locations_metadata', inserts);
  },

  'cities-2018': async function () {
    // Clear table
    await db.delete().from('cities');

    // Get 2018 cities from Athena
    const athenaGetCities2018 = await readJson(
      path.join(fixturesPath, 'athena-query-results/get-cities-2018.json')
    );

    // Upsert cities
    await upsertCities(athenaGetCities2018);
  }
};

export default function (name) {
  return scenarios[name]();
}

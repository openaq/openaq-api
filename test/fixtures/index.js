import path from 'path';
import { readJson } from 'fs-extra';
import { db } from '../../api/services/db';
import {
  applyParametersMeta,
  reconcileLocationIds,
  upsertLocations,
  upsertCities
} from '../../api/services/athena-sync';

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
      inserts.push({
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
          ]
        }
      });
    }

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

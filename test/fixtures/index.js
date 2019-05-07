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

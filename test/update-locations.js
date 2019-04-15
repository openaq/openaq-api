import path from 'path';
import { readJson } from 'fs-extra';
import { db } from '../api/services/db';
import { upsertLocations } from '../lib/update-locations';
import { expect } from 'chai';

/* global fixturesPath */

describe('Update locations task', function () {
  it('Should insert new locations', async function () {
    // Clean up table locations
    await db.delete().from('locations');

    // Load data from athena up to 2016
    const queryResults = await readJson(
      path.join(fixturesPath, 'athena-query-results/locations-up-to-2016.json')
    );

    // Pass query results to insert task
    await upsertLocations(queryResults);

    // Verify total count
    const { count: totalCount } = await db
      .count('id')
      .from('locations')
      .first();
    expect(totalCount).equal('4761');

    // Verify locations count per country
    let locationsPerCountry = await db
      .select(db.raw('country, count(country)'))
      .from('locations')
      .orderBy('country')
      .groupBy('country');
    expect(locationsPerCountry).to.have.length(44);
    expect(locationsPerCountry).to.have.deep.members([
      { country: 'AR', count: '1' },
      { country: 'AT', count: '173' },
      { country: 'AU', count: '28' },
      { country: 'BA', count: '12' },
      { country: 'BD', count: '3' },
      { country: 'BE', count: '98' },
      { country: 'BH', count: '1' },
      { country: 'BR', count: '1' },
      { country: 'CA', count: '157' },
      { country: 'CL', count: '110' },
      { country: 'CN', count: '6' },
      { country: 'CO', count: '2' },
      { country: 'CZ', count: '102' },
      { country: 'DE', count: '434' },
      { country: 'DK', count: '11' },
      { country: 'ES', count: '333' },
      { country: 'ET', count: '2' },
      { country: 'FI', count: '51' },
      { country: 'FR', count: '462' },
      { country: 'GB', count: '160' },
      { country: 'GH', count: '11' },
      { country: 'GI', count: '3' },
      { country: 'HR', count: '15' },
      { country: 'HU', count: '25' },
      { country: 'ID', count: '5' },
      { country: 'IE', count: '11' },
      { country: 'IL', count: '1' },
      { country: 'IN', count: '56' },
      { country: 'MK', count: '15' },
      { country: 'MN', count: '15' },
      { country: 'MX', count: '48' },
      { country: 'NG', count: '1' },
      { country: 'NL', count: '92' },
      { country: 'NO', count: '60' },
      { country: 'PE', count: '12' },
      { country: 'PH', count: '1' },
      { country: 'PL', count: '16' },
      { country: 'SG', count: '1' },
      { country: 'TH', count: '61' },
      { country: 'TR', count: '134' },
      { country: 'TW', count: '67' },
      { country: 'US', count: '1957' },
      { country: 'VN', count: '5' },
      { country: 'XK', count: '2' }
    ]);

    // Only one location with null coordinates can exist per country
    let noCoordsLocations = await db
      .select(db.raw('country, count(country)'))
      .from('locations')
      .where({
        lon: null,
        lat: null
      })
      .orderBy('country')
      .groupBy('country');
    expect(noCoordsLocations).to.have.length(4);
    expect(noCoordsLocations).to.have.deep.members([
      { country: 'BR', count: '1' },
      { country: 'PL', count: '1' },
      { country: 'TH', count: '1' },
      { country: 'IN', count: '1' }
    ]);
  });
});

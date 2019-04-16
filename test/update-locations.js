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
    const queryResults2016 = await readJson(
      path.join(fixturesPath, 'athena-query-results/locations-up-to-2016.json')
    );

    // Pass query results to upsert task
    await upsertLocations(queryResults2016);

    // Verify total count
    const { count: totalCount2016 } = await db
      .count('id')
      .from('locations')
      .first();
    expect(totalCount2016).equal('4761');

    // Verify locations count per country
    const locationsPerCountry2016 = await db
      .select(db.raw('country, count(country)'))
      .from('locations')
      .orderBy('country')
      .groupBy('country');
    expect(locationsPerCountry2016).to.have.length(44);
    expect(locationsPerCountry2016).to.have.deep.members([
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
    const noCoordsLocations2016 = await db
      .select(db.raw('country, count(country)'))
      .from('locations')
      .where({
        lon: null,
        lat: null
      })
      .orderBy('country')
      .groupBy('country');
    expect(noCoordsLocations2016).to.have.length(4);
    expect(noCoordsLocations2016).to.have.deep.members([
      { country: 'BR', count: '1' },
      { country: 'PL', count: '1' },
      { country: 'TH', count: '1' },
      { country: 'IN', count: '1' }
    ]);

    // Load data from athena up to 2016
    const queryResults2018 = await readJson(
      path.join(fixturesPath, 'athena-query-results/locations-up-to-2018.json')
    );

    // Pass query results to upsert task
    await upsertLocations(queryResults2018);

    // Verify total count
    const { count: totalCount } = await db
      .count('id')
      .from('locations')
      .first();
    expect(totalCount).equal('9833');

    // Only one location with null coordinates can exist per country
    const noCoordsLocations2018 = await db
      .select(db.raw('country, count(country)'))
      .from('locations')
      .where({
        lon: null,
        lat: null
      })
      .orderBy('country')
      .groupBy('country');

    expect(noCoordsLocations2018).to.have.length(13);
    expect(noCoordsLocations2018).to.have.deep.members([
      { country: 'AU', count: '1' },
      { country: 'BA', count: '1' },
      { country: 'BR', count: '1' },
      { country: 'CN', count: '1' },
      { country: 'ES', count: '1' },
      { country: 'IL', count: '1' },
      { country: 'IN', count: '1' },
      { country: 'NL', count: '1' },
      { country: 'PL', count: '1' },
      { country: 'RU', count: '1' },
      { country: 'SE', count: '1' },
      { country: 'TH', count: '1' },
      { country: 'ZA', count: '1' }
    ]);
  });
});

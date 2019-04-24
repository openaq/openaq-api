import path from 'path';
import { readJson } from 'fs-extra';
import { db } from '../api/services/db';
import {
  upsertLocations,
  reconcileLocationIds,
  applyParametersMeta
} from '../api/services/locations-update';
import { expect } from 'chai';

/* global fixturesPath */

describe('Update locations service', function () {
  it('Upsert locations of 2016, and then, 2018', async function () {
    // Increase timeout for this test
    this.timeout(6000);

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

    expect(locations2016).to.have.length(269);

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

    // Verify total count
    const { count: totalCount2016 } = await db
      .count('id')
      .from('locations')
      .first();
    expect(totalCount2016).equal('269');

    // Verify locations count per country
    const locationsPerCountry2016 = await db
      .select(db.raw('country, count(country)'))
      .from('locations')
      .orderBy('country')
      .groupBy('country');
    expect(locationsPerCountry2016).to.have.length(4);
    expect(locationsPerCountry2016).to.have.deep.members([
      { country: 'BR', count: '1' },
      { country: 'GB', count: '160' },
      { country: 'NL', count: '92' },
      { country: 'PL', count: '16' }
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
    expect(noCoordsLocations2016).to.have.length(2);
    expect(noCoordsLocations2016).to.have.deep.members([
      { country: 'BR', count: '1' },
      { country: 'PL', count: '1' }
    ]);

    // Verify measurement count per country
    const measurementsPerCountry2016 = await db
      .select(db.raw('country, sum(count)'))
      .from('locations')
      .orderBy('country')
      .groupBy('country');
    expect(measurementsPerCountry2016).to.have.length(4);
    expect(measurementsPerCountry2016).to.have.deep.members([
      { country: 'BR', sum: '1686267' },
      { country: 'GB', sum: '2451142' },
      { country: 'NL', sum: '2872212' },
      { country: 'PL', sum: '537032' }
    ]);

    // Only one location with null coordinates can exist per country
    const [singleLocation2016] = await db
      .select('*')
      .from('locations')
      .where({
        id: 'GB-13'
      })
      .map(l => {
        l.firstUpdated = l.firstUpdated.toISOString();
        l.lastUpdated = l.lastUpdated.toISOString();
        return l;
      });
    expect(singleLocation2016).to.deep.equal({
      id: 'GB-13',
      name: null,
      country: 'GB',
      city: ['London'],
      location: ['Haringey Roadside'],
      sourceName: ['Greater London', 'DEFRA'],
      sourceType: ['government'],
      lon: '-0.06822',
      lat: '51.5993',
      firstUpdated: '2015-08-12T18:00:00.000Z',
      lastUpdated: '2016-12-31T23:00:00.000Z',
      coordinates: '0101000020E6100000F4E0EEACDD76B1BF143FC6DCB5CC4940',
      parameters: ['no2', 'pm25'],
      countsByMeasurement: [
        { parameter: 'no2', count: 10105 },
        { parameter: 'pm25', count: 3113 }
      ],
      count: 13218
    });

    // Load athena data up to 2018
    const locationBaseDataQueryResults2018 = await readJson(
      path.join(fixturesPath, 'athena-query-results/locations-up-to-2018.json')
    );

    // Reconcile ids from existing locations
    let locations2018 = await reconcileLocationIds(
      locationBaseDataQueryResults2018
    );

    expect(locations2018).to.have.length(603);

    // Load parameter count query, from up to 2018
    const parametersQueryResults2018 = await readJson(
      path.join(fixturesPath, 'athena-query-results/parameters-up-to-2018.json')
    );

    // Apply parameters meta
    locations2018 = await applyParametersMeta(
      locations2018,
      parametersQueryResults2018
    );

    // Upsert locations
    await upsertLocations(locations2018);

    // Verify total count
    const { count: totalCount2018 } = await db
      .count('id')
      .from('locations')
      .first();
    expect(totalCount2018).equal('603');

    // Verify locations count per country
    const locationsPerCountry2018 = await db
      .select(db.raw('country, count(country)'))
      .from('locations')
      .orderBy('country')
      .groupBy('country');
    expect(locationsPerCountry2018).to.have.length(5);
    expect(locationsPerCountry2018).to.have.deep.members([
      { country: 'BR', count: '62' },
      { country: 'GB', count: '162' },
      { country: 'IT', count: '104' },
      { country: 'NL', count: '93' },
      { country: 'PL', count: '182' }
    ]);

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
    expect(noCoordsLocations2018).to.have.length(3);
    expect(noCoordsLocations2018).to.have.deep.members([
      { country: 'BR', count: '1' },
      { country: 'NL', count: '1' },
      { country: 'PL', count: '1' }
    ]);

    // Verify measurement count per country
    const measurementsPerCountry2018 = await db
      .select(db.raw('country, sum(count)'))
      .from('locations')
      .orderBy('country')
      .groupBy('country');
    expect(measurementsPerCountry2018).to.have.length(5);
    expect(measurementsPerCountry2018).to.have.deep.members([
      { country: 'BR', sum: '2812094' },
      { country: 'GB', sum: '7367176' },
      { country: 'IT', sum: '1823057' },
      { country: 'NL', sum: '6200408' },
      { country: 'PL', sum: '1111192' }
    ]);

    // Only one location with null coordinates can exist per country
    const [singleLocation2018] = await db
      .select('*')
      .from('locations')
      .where({
        id: 'GB-13'
      })
      .map(l => {
        l.firstUpdated = l.firstUpdated.toISOString();
        l.lastUpdated = l.lastUpdated.toISOString();
        return l;
      });

    expect(singleLocation2018).to.deep.equal({
      id: 'GB-13',
      name: null,
      country: 'GB',
      city: ['London'],
      location: ['Haringey Roadside'],
      sourceName: ['Greater London', 'DEFRA'],
      sourceType: ['government'],
      lon: '-0.06822',
      lat: '51.5993',
      firstUpdated: '2015-08-12T18:00:00.000Z',
      lastUpdated: '2018-12-31T23:00:00.000Z',
      coordinates: '0101000020E6100000F4E0EEACDD76B1BF143FC6DCB5CC4940',
      parameters: ['no2', 'pm25'],
      countsByMeasurement: [
        { parameter: 'no2', count: 23328 },
        { parameter: 'pm25', count: 3113 }
      ],
      count: 26441
    });
  });
});

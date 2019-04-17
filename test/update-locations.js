import path from 'path';
import { readJson } from 'fs-extra';
import { db } from '../api/services/db';
import {
  upsertLocations,
  reconcileLocationIds,
  applyParametersMeta
} from '../lib/update-locations';
import { expect } from 'chai';

/* global fixturesPath */

describe('Update locations task', function () {
  it('Upsert locations of 2016, and then, of 2018', async function () {
    // Increase this test timeout to 2 minutes
    this.timeout(120000);

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

    expect(locations2016).to.have.length(4761);

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

    // Verify measurement count per country
    const measurementsPerCountry2016 = await db
      .select(db.raw('country, sum(count)'))
      .from('locations')
      .orderBy('country')
      .groupBy('country');
    expect(measurementsPerCountry2016).to.have.length(44);
    expect(measurementsPerCountry2016).to.have.deep.members([
      { country: 'AR', sum: '2448' },
      { country: 'AT', sum: '121987' },
      { country: 'AU', sum: '1090696' },
      { country: 'BA', sum: '259270' },
      { country: 'BD', sum: '8462' },
      { country: 'BE', sum: '184744' },
      { country: 'BH', sum: '720' },
      { country: 'BR', sum: '1686267' },
      { country: 'CA', sum: '976531' },
      { country: 'CL', sum: '2498233' },
      { country: 'CN', sum: '63596' },
      { country: 'CO', sum: '6948' },
      { country: 'CZ', sum: '164399' },
      { country: 'DE', sum: '251585' },
      { country: 'DK', sum: '13858' },
      { country: 'ES', sum: '385358' },
      { country: 'ET', sum: '4514' },
      { country: 'FI', sum: '19526' },
      { country: 'FR', sum: '52356' },
      { country: 'GB', sum: '2451142' },
      { country: 'GH', sum: '1595' },
      { country: 'GI', sum: '860' },
      { country: 'HR', sum: '18439' },
      { country: 'HU', sum: '2581' },
      { country: 'ID', sum: '20633' },
      { country: 'IE', sum: '1091' },
      { country: 'IL', sum: '1826' },
      { country: 'IN', sum: '2275527' },
      { country: 'MK', sum: '10504' },
      { country: 'MN', sum: '1234486' },
      { country: 'MX', sum: '965143' },
      { country: 'NG', sum: '2541' },
      { country: 'NL', sum: '2872212' },
      { country: 'NO', sum: '86026' },
      { country: 'PE', sum: '320989' },
      { country: 'PH', sum: '958' },
      { country: 'PL', sum: '537032' },
      { country: 'SG', sum: '1275' },
      { country: 'TH', sum: '1432970' },
      { country: 'TR', sum: '90289' },
      { country: 'TW', sum: '94488' },
      { country: 'US', sum: '13902101' },
      { country: 'VN', sum: '17353' },
      { country: 'XK', sum: '6408' }
    ]);

    // Only one location with null coordinates can exist per country
    const [singleLocation2016] = await db
      .select('*')
      .from('locations')
      .where({
        id: 'FR-292'
      });
    expect(singleLocation2016).to.deep.include({
      id: 'FR-292',
      coordinates: '0101000020E6100000384A5E9D63201F4043E21E4B1F4E4840',
      count: 145,
      country: 'FR',
      lat: '48.61033',
      lon: '7.78163',
      countsByMeasurement: [
        {
          count: 50,
          parameter: 'no2'
        },
        {
          count: 49,
          parameter: 'o3'
        },
        {
          count: 46,
          parameter: 'pm10'
        }
      ],
      parameters: ['no2', 'o3', 'pm10']
    });

    // Load athena data up to 2016
    const locationBaseDataQueryResults2018 = await readJson(
      path.join(fixturesPath, 'athena-query-results/locations-up-to-2018.json')
    );

    // Reconcile ids from existing locations
    let locations2018 = await reconcileLocationIds(
      locationBaseDataQueryResults2018
    );

    expect(locations2018).to.have.length(9833);

    // Load parameter count query, from up to 2016
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
    expect(totalCount2018).equal('9833');

    // Verify locations count per country
    const locationsPerCountry2018 = await db
      .select(db.raw('country, count(country)'))
      .from('locations')
      .orderBy('country')
      .groupBy('country');
    expect(locationsPerCountry2018).to.have.length(68);
    expect(locationsPerCountry2018).to.have.deep.members([
      { country: 'AD', count: '3' },
      { country: 'AE', count: '2' },
      { country: 'AR', count: '4' },
      { country: 'AT', count: '349' },
      { country: 'AU', count: '122' },
      { country: 'BA', count: '22' },
      { country: 'BD', count: '3' },
      { country: 'BE', count: '109' },
      { country: 'BH', count: '1' },
      { country: 'BR', count: '62' },
      { country: 'CA', count: '192' },
      { country: 'CH', count: '29' },
      { country: 'CL', count: '137' },
      { country: 'CN', count: '1513' },
      { country: 'CO', count: '32' },
      { country: 'CW', count: '1' },
      { country: 'CZ', count: '188' },
      { country: 'DE', count: '442' },
      { country: 'DK', count: '17' },
      { country: 'ES', count: '509' },
      { country: 'ET', count: '2' },
      { country: 'FI', count: '53' },
      { country: 'FR', count: '1030' },
      { country: 'GB', count: '162' },
      { country: 'GH', count: '11' },
      { country: 'GI', count: '3' },
      { country: 'HK', count: '16' },
      { country: 'HR', count: '18' },
      { country: 'HU', count: '28' },
      { country: 'ID', count: '5' },
      { country: 'IE', count: '15' },
      { country: 'IL', count: '137' },
      { country: 'IN', count: '206' },
      { country: 'IT', count: '104' },
      { country: 'KE', count: '2' },
      { country: 'KW', count: '1' },
      { country: 'KZ', count: '1' },
      { country: 'LK', count: '1' },
      { country: 'LT', count: '17' },
      { country: 'LU', count: '7' },
      { country: 'LV', count: '4' },
      { country: 'MK', count: '15' },
      { country: 'MN', count: '41' },
      { country: 'MT', count: '4' },
      { country: 'MX', count: '52' },
      { country: 'NG', count: '1' },
      { country: 'NL', count: '93' },
      { country: 'NO', count: '79' },
      { country: 'NP', count: '2' },
      { country: 'PE', count: '12' },
      { country: 'PH', count: '1' },
      { country: 'PL', count: '182' },
      { country: 'PT', count: '67' },
      { country: 'RS', count: '5' },
      { country: 'RU', count: '49' },
      { country: 'SE', count: '11' },
      { country: 'SG', count: '1' },
      { country: 'SI', count: '8' },
      { country: 'SK', count: '38' },
      { country: 'TH', count: '61' },
      { country: 'TR', count: '172' },
      { country: 'TW', count: '82' },
      { country: 'UG', count: '1' },
      { country: 'US', count: '3284' },
      { country: 'UZ', count: '1' },
      { country: 'VN', count: '5' },
      { country: 'XK', count: '2' },
      { country: 'ZA', count: '4' }
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

    // Verify measurement count per country
    const measurementsPerCountry2018 = await db
      .select(db.raw('country, sum(count)'))
      .from('locations')
      .orderBy('country')
      .groupBy('country');
    expect(measurementsPerCountry2018).to.have.length(68);
    expect(measurementsPerCountry2018).to.have.deep.members([
      { country: 'AD', sum: '64579' },
      { country: 'AE', sum: '28873' },
      { country: 'AR', sum: '14976' },
      { country: 'AT', sum: '1521351' },
      { country: 'AU', sum: '5663004' },
      { country: 'BA', sum: '966507' },
      { country: 'BD', sum: '25384' },
      { country: 'BE', sum: '1557673' },
      { country: 'BH', sum: '31539' },
      { country: 'BR', sum: '2812094' },
      { country: 'CA', sum: '3985490' },
      { country: 'CH', sum: '863160' },
      { country: 'CL', sum: '6064588' },
      { country: 'CN', sum: '30189963' },
      { country: 'CO', sum: '217354' },
      { country: 'CW', sum: '10987' },
      { country: 'CZ', sum: '3764884' },
      { country: 'DE', sum: '10759808' },
      { country: 'DK', sum: '388799' },
      { country: 'ES', sum: '13336127' },
      { country: 'ET', sum: '39238' },
      { country: 'FI', sum: '1317566' },
      { country: 'FR', sum: '15960198' },
      { country: 'GB', sum: '8206530' },
      { country: 'GH', sum: '1595' },
      { country: 'GI', sum: '40842' },
      { country: 'HK', sum: '844549' },
      { country: 'HR', sum: '580605' },
      { country: 'HU', sum: '1328096' },
      { country: 'ID', sum: '55389' },
      { country: 'IE', sum: '182796' },
      { country: 'IL', sum: '195533826' },
      { country: 'IN', sum: '11383175' },
      { country: 'IT', sum: '2303009' },
      { country: 'KE', sum: '2842' },
      { country: 'KW', sum: '16099' },
      { country: 'KZ', sum: '5939' },
      { country: 'LK', sum: '11598' },
      { country: 'LT', sum: '306468' },
      { country: 'LU', sum: '264943' },
      { country: 'LV', sum: '107008' },
      { country: 'MK', sum: '806221' },
      { country: 'MN', sum: '2771490' },
      { country: 'MT', sum: '149807' },
      { country: 'MX', sum: '2607985' },
      { country: 'NG', sum: '2541' },
      { country: 'NL', sum: '6842301' },
      { country: 'NO', sum: '2359632' },
      { country: 'NP', sum: '60275' },
      { country: 'PE', sum: '690166' },
      { country: 'PH', sum: '958' },
      { country: 'PL', sum: '2613611' },
      { country: 'PT', sum: '1953403' },
      { country: 'RS', sum: '83383' },
      { country: 'RU', sum: '187117' },
      { country: 'SE', sum: '333209' },
      { country: 'SG', sum: '1275' },
      { country: 'SI', sum: '88821' },
      { country: 'SK', sum: '1425839' },
      { country: 'TH', sum: '4209841' },
      { country: 'TR', sum: '5640285' },
      { country: 'TW', sum: '3994941' },
      { country: 'UG', sum: '16080' },
      { country: 'US', sum: '46688569' },
      { country: 'UZ', sum: '6427' },
      { country: 'VN', sum: '51879' },
      { country: 'XK', sum: '23611' },
      { country: 'ZA', sum: '582506' }
    ]);

    // Only one location with null coordinates can exist per country
    const [singleLocation2018] = await db
      .select('*')
      .from('locations')
      .where({
        id: 'FR-292'
      });
    expect(singleLocation2018).to.deep.include({
      id: 'FR-292',
      coordinates: '0101000020E6100000384A5E9D63201F4043E21E4B1F4E4840',
      count: 28938,
      country: 'FR',
      lat: '48.61033',
      lon: '7.78163',
      countsByMeasurement: [
        {
          count: 9777,
          parameter: 'no2'
        },
        {
          count: 9515,
          parameter: 'o3'
        },
        {
          count: 9646,
          parameter: 'pm10'
        }
      ],
      parameters: ['no2', 'o3', 'pm10']
    });
  });
});

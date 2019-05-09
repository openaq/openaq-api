import {
  filter,
  find,
  groupBy,
  isNumber,
  map,
  omit,
  pick,
  sortBy,
  uniq
} from 'lodash';
import { db } from './db';
import athena from './athena';
import { log } from './logger';
import queries from '../../lib/athena-queries';

export const reconcileLocationIds = async function (athenaQueryResults) {
  // Get current locations, convert coordinates to float when not null
  const currentLocations = await db
    .select(
      db.raw('id, country, lat, lon, substring(id from 4)::int as id_int')
    )
    .from('locations')
    .orderBy(['country', 'id_int'])
    .map(l => {
      return {
        id: l.id,
        id_int: l.id_int,
        country: l.country,
        lat: l.lat !== null ? parseFloat(l.lat) : null,
        lon: l.lon !== null ? parseFloat(l.lon) : null
      };
    });

  // Get last ids used in each country, assuming locations are sorted by id_int
  const lastIdInCountry = currentLocations.reduce((acc, r) => {
    acc[r.country] = r.id_int;
    return acc;
  }, {});

  // Group location by country, lon and lat
  let incomingLocations = groupBy(athenaQueryResults, l =>
    l.country.concat(l.lon, l.lat)
  );

  // Merge distinct values for city, location, source and timestamp
  incomingLocations = map(incomingLocations, locationRows => {
    // Get base properties from first location
    const { lon, lat, country, firstUpdated, lastUpdated } = locationRows[0];

    // Merge properties
    const l = locationRows.reduce(
      (acc, i) => {
        if (i.city) acc.cities.push(i.city);
        if (i.location) acc.locations.push(i.location);
        if (i.sourceName) acc.sourceNames.push(i.sourceName);
        if (i.sourceType) acc.sourceTypes.push(i.sourceType);
        if (acc.firstUpdated > i.firstUpdated) {
          acc.firstUpdated = i.firstUpdated;
        }

        // If incoming location is more up-to-date, use its values for
        // city, location and sources
        if (acc.lastUpdated < i.lastUpdated) {
          acc.lastUpdated = i.lastUpdated;

          if (i.city) acc.city = i.city;
          if (i.sourceName) acc.sourceName = i.sourceName;
          if (i.sourceType) acc.sourceType = i.sourceType;
          if (i.location) acc.location = i.location;
        }
        return acc;
      },
      {
        lon,
        lat,
        country,
        firstUpdated,
        lastUpdated,
        cities: [],
        locations: [],
        sourceNames: [],
        sourceTypes: []
      }
    );

    // Discard duplicates
    l.cities = uniq(l.cities);
    l.locations = uniq(l.locations);
    l.sourceNames = uniq(l.sourceNames);
    l.sourceTypes = uniq(l.sourceTypes);

    if (typeof lon !== 'undefined') l.lon = parseFloat(lon);
    if (typeof lat !== 'undefined') l.lat = parseFloat(lat);
    return l;
  });
  incomingLocations = sortBy(incomingLocations, ['country', 'firstUpdated']);

  // Build new locations list
  const updatedListOfLocations = [];
  for (const incomingLocation of incomingLocations) {
    // Find existing location
    const currentLocation = find(currentLocations, l => {
      return (
        l.country === incomingLocation.country &&
        ((!l.lon && !incomingLocation.lon && !l.lat && !incomingLocation.lat) ||
          (l.lon === incomingLocation.lon && l.lat === incomingLocation.lat))
      );
    });

    // Keep location to be inserted, if doesn't exist yet
    if (!currentLocation) {
      // Increment id counter for country
      const lastId = (lastIdInCountry[incomingLocation.country] || 0) + 1;

      // Format id
      incomingLocation.id = `${incomingLocation.country}-${lastId}`;

      // Add location to batch
      updatedListOfLocations.push(incomingLocation);

      // Update country counter
      lastIdInCountry[incomingLocation.country] = lastId;
    } else {
      // Location already exist, keep it for future operations
      updatedListOfLocations.push(
        Object.assign({}, currentLocation, incomingLocation)
      );
    }
  }

  return sortBy(updatedListOfLocations, ['id']);
};

export const applyParametersMeta = async function (
  locations,
  athenaQueryResults
) {
  // Set correct types for coordinates and counts
  const parametersCounts = athenaQueryResults.map(r => {
    const { lon, lat } = r;
    if (typeof lon !== 'undefined') r.lon = parseFloat(lon);
    if (typeof lat !== 'undefined') r.lat = parseFloat(lat);
    r.count = parseInt(r.count);
    return r;
  });

  return locations.map(l => {
    // Get parameters for location
    const parametersCount = filter(parametersCounts, p => {
      return (
        l.country === p.country &&
        ((!l.lon && !p.lon && !l.lat && !p.lat) ||
          (l.lon === p.lon && l.lat === p.lat))
      );
    });

    // Merge parameters into locations, if exist
    if (parametersCount && parametersCount.length > 0) {
      l.parameters = parametersCount.map(p => p.parameter).sort();
      l.countsByMeasurement = parametersCount
        .map(p => pick(p, ['parameter', 'count']))
        .sort((a, b) => a.parameter.localeCompare(b.parameter));
      l.count = l.countsByMeasurement.reduce((acc, i) => acc + i.count, 0);
    } else {
      l.parametersCount = 0;
    }

    return l;
  });
};

export const upsertLocations = async function (locations) {
  const existingIds = await db
    .select('id')
    .from('locations')
    .map(r => r.id);

  const locationsToInsert = [];
  const locationsToUpdate = [];
  for (let l of locations) {
    // Generate WKT from coordinates, if available
    if (isNumber(l.lon) && isNumber(l.lat)) {
      l.coordinates = `POINT(${l.lon} ${l.lat})`;
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

    // Check to insert or update location
    existingIds.includes(l.id)
      ? locationsToUpdate.push(l)
      : locationsToInsert.push(l);
  }

  await db.transaction(async trx => {
    // Insert new locations
    await db.batchInsert('locations', locationsToInsert).transacting(trx);

    // Update existing locations
    for (const existingLocation of locationsToUpdate) {
      await trx('locations')
        .update(existingLocation)
        .where({ id: existingLocation.id });
    }
  });
};

export const upsertCities = async function (athenaQueryResults) {
  const existingCitiesTemporaryKey = await db
    .select('country', 'name')
    .from('cities')
    .map(c => c.country + c.name);

  const citiesToInsert = [];
  const citiesToUpdate = [];
  for (let c of athenaQueryResults) {
    // Pick allowed city properties
    c = pick(c, ['country', 'name', 'locations', 'count']);

    // Create temporary key
    c.temporaryKey = c.country + c.name;

    // Check to insert or update city
    existingCitiesTemporaryKey.includes(c.temporaryKey)
      ? citiesToUpdate.push(omit(c, 'temporaryKey'))
      : citiesToInsert.push(omit(c, 'temporaryKey'));
  }

  // Wrap change in transaction
  await db.transaction(async trx => {
    // Insert new cities
    await db.batchInsert('cities', citiesToInsert).transacting(trx);

    // Update existing cities
    for (const existingCity of citiesToUpdate) {
      await trx('cities')
        .update(existingCity)
        .where({ country: existingCity.country, name: existingCity.name });
    }
  });
};

/*
 * The following task will fetch data about locations and cities from Athena
 * and will update the database, add new objects and updating metadata about
 * existing ones.
 */
let updating = false;
export const startAthenaSyncTask = async function () {
  if (!updating) {
    // Update flow control flag to avoid restart update unnecessarily
    updating = true;

    // Enclosed in a try/catch block to help control execution with
    // "updating" variable.
    try {
      log('info', 'Athena sync task started.');

      // Get locations metadata using Athena
      const locationsMeta = await athena.query(queries.locationsMetadata);

      // Reconcile ids from existing locations
      let locations = await reconcileLocationIds(locationsMeta);

      // Get parameters metadata from Athena
      const parametersMeta = await athena.query(queries.parametersByLocation);

      // Merge parameters to locations
      locations = await applyParametersMeta(locations, parametersMeta);

      // Perform locations upsert
      await upsertLocations(locations);

      // Fetch cities data from Athena
      const citiesMeta = await athena.query(queries.getCities);

      // Update available cities and related metadata
      await upsertCities(citiesMeta);

      log('info', 'Athena sync task finished successfully.');
    } catch (err) {
      log('error', `Athena sync task error: ${err.message}`);
    } finally {
      // Update flow control flag
      updating = false;
    }
  }
};

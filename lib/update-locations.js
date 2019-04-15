import { cloneDeep, find, sortBy } from 'lodash';
import { db } from '../api/services/db';

export const upsertLocations = async function (queryResults) {
  // Clone query results to avoid mutation
  let incomingLocations = cloneDeep(queryResults);

  // Convert coordinates to float if not null
  incomingLocations = incomingLocations.map(l => {
    const { lon, lat } = l;
    if (typeof lon !== 'undefined') l.lon = parseFloat(lon);
    if (typeof lat !== 'undefined') l.lat = parseFloat(lat);
    return l;
  });

  // Sort locations by country and first update
  incomingLocations = sortBy(incomingLocations, ['country', 'firstUpdated']);

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

  // Build new locations list
  const newLocations = [];
  for (const incomingLocation of incomingLocations) {
    // Find existing location
    const currentLocation = find(currentLocations, l => {
      return (
        l.country === incomingLocation.country &&
        ((!l.lon && !incomingLocation.lon && !l.lat && !incomingLocation.lat) ||
          (l.lon === incomingLocation.lon && l.lat === incomingLocation.lat))
      );
    });

    // Add new location to insert, if it doesn't exist
    if (!currentLocation) {
      const lastId = (lastIdInCountry[incomingLocation.country] || 0) + 1;
      incomingLocation.id = `${incomingLocation.country}-${lastId}`;
      newLocations.push(incomingLocation);
      lastIdInCountry[incomingLocation.country] = lastId;
    }
  }

  // Batch insert new locations, if found
  if (newLocations.length > 0) {
    await db.batchInsert('locations', newLocations);
  }
};

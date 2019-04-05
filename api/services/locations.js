import config from 'config';
import AWS from 'aws-sdk';
import { has, sortBy } from 'lodash';
import { db } from './db';

// Athena config
const {
  accessKeyId,
  secretAccessKey,
  OutputLocation,
  Database,
  region,
  measurementsTable
} = config.get('athena');

// Athena client
const athena = new AWS.Athena({
  accessKeyId,
  secretAccessKey,
  region
});

// The locations query
const QueryString = `
  SELECT
    UPPER(country) as country,
    round(coordinates.longitude, 5) AS lon,
    round(coordinates.latitude, 5) AS lat,
    min(date.local) AS firstUpdated,
    max(date.local) AS lastUpdated
  FROM ${measurementsTable}
  GROUP BY
    UPPER(country),
    round(coordinates.longitude,5),
    round(coordinates.latitude,5)
  ORDER BY
    UPPER(country), 
    firstUpdated
`;

// Flow control variables
const checkQueryStatusInterval = 2000;
let intervalId = false;
let QueryExecutionId;

const checkQueryStatus = async function () {
  function stopListener () {
    intervalId = clearInterval(intervalId);
  }

  try {
    const data = await athena.getQueryExecution({ QueryExecutionId }).promise();

    // If response is malformed, stop listener.
    if (!has(data, 'QueryExecution.Status.State')) {
      console.log('Error while fetching Athena query status.');
      stopListener();
      return;
    }

    // Process state
    const { State } = data.QueryExecution.Status;
    if (State === 'SUCCEEDED') {
      // update locations
      console.log('Athena query was finished successfully!');
      stopListener();
      upsertLocations();
    } else if (State !== 'RUNNING') {
      console.log('Athena query was interrupted.');
      stopListener();
    } else {
      console.log('Athena query is running...');
    }
  } catch (err) {
    // Unexpected error occurred.
    console.log(err, err.stack);
    stopListener();
  }
};

export const fetchLocations = async function () {
  // Check if a query is already running
  if (!intervalId) {
    console.log('Creating Athena query.');
    const data = await athena
      .startQueryExecution({
        QueryString,
        QueryExecutionContext: {
          Database
        },
        ResultConfiguration: {
          OutputLocation
        }
      })
      .promise();

    // Register query run and start listener
    QueryExecutionId = data.QueryExecutionId;
    intervalId = setInterval(checkQueryStatus, checkQueryStatusInterval);
  }
};

export const upsertLocations = async function () {
  let queryResults = await athena
    .getQueryResults({ QueryExecutionId })
    .promise();

  if (has(queryResults, 'ResultSet.Rows')) {
    let rows = queryResults.ResultSet.Rows;

    // Flatten "Data" and "VarCharValue" properties used by Athena
    rows = rows.map(r => {
      r = r.Data;
      return r.map(value => value.VarCharValue);
    });

    // Get available properties
    const properties = rows.shift();

    // Parse rows into JSON
    let locations = rows.map(r => {
      const location = {};
      for (let i = 0; i < r.length; i++) {
        location[properties[i]] = r[i];
        location.lon = parseFloat(location.lon);
        location.lat = parseFloat(location.lat);
      }
      return location;
    });

    // Sort locations
    locations = sortBy(locations, ['country', 'firstUpdated']);

    // Get number of locations per country
    let locationsPerCountry = await db
      .select(db.raw('country, count(country)'))
      .from('locations')
      .groupBy('country');

    // Transform results for easier access
    locationsPerCountry = locationsPerCountry.reduce((acc, r) => {
      acc[r.country] = parseInt(r.count);
      return acc;
    }, {});

    for (const location of locations) {
      // Check for a location id
      const locationId = (
        (await db
          .select('id')
          .from('locations')
          .where({
            country: location.country,
            lon: location.lon,
            lat: location.lat
          })
          .first()) || {}
      ).id;

      // Insert location, if it doesn't exist
      if (!locationId) {
        const countryCount = (locationsPerCountry[location.country] || 0) + 1;
        location.id = `${location.country}-${countryCount}`;
        await db.insert(location).into('locations');
        console.log(location.id + ' found');
        locationsPerCountry[location.country] = countryCount;
      }
    }
  }
};

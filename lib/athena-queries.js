import config from 'config';
const { fetchesTable } = config.get('athena');

module.exports = {
  locationsMetadata: `
    SELECT
      UPPER(country) as country,
      round(coordinates.longitude, 5) AS lon,
      round(coordinates.latitude, 5) AS lat,
      min(date.local) AS firstUpdated,
      max(date.local) AS lastUpdated,
      sourcename as sourceName,
      sourcetype as sourceType,
      city,
      location
    FROM ${fetchesTable}
    WHERE
      (coordinates.longitude BETWEEN -180 AND 180) AND
      (coordinates.latitude BETWEEN -90 AND 90)    
    GROUP BY
      UPPER(country),
      round(coordinates.longitude,5),
      round(coordinates.latitude,5),
      sourcename,
      sourcetype,
      city,
      location
    ORDER BY
      country, 
      firstUpdated
  `,
  parametersByLocation: `
    SELECT
      UPPER(country) as country,
      round(coordinates.longitude, 5) AS lon,
      round(coordinates.latitude, 5) AS lat,
      parameter,
      COUNT(parameter) AS count
    FROM ${fetchesTable}
    WHERE
      (coordinates.longitude BETWEEN -180 AND 180) AND
      (coordinates.latitude BETWEEN -90 AND 90)    
    GROUP BY
      UPPER(country),
      round(coordinates.longitude,5),
      round(coordinates.latitude,5),
      parameter
  `,
  getCities: `
    SELECT 
      UPPER(country) as country,
      city as name, 
      count(DISTINCT location) as locations, 
      count(parameter) as count
    FROM ${fetchesTable} 
    WHERE
      (coordinates.longitude BETWEEN -180 AND 180) AND
      (coordinates.latitude BETWEEN -90 AND 90)
    GROUP BY 
      UPPER(country),
      city
  `
};

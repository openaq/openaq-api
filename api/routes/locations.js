'use strict';
import { db } from '../services/db';
import { log } from '../services/logger';
import { lonLatRegex } from '../../lib/utils';
import Boom from 'boom';
import config from 'config';
import Joi from 'joi';

const defaultGeoRadius = config.get('geoRadius');
const maxRequestLimit = config.get('maxRequestLimit');
const defaultRequestLimit = config.get('defaultRequestLimit');
const orderableColumns = ['city', 'country', 'location', 'distance', 'count'];

/**
 * @api {get} /locations GET
 * @apiGroup Locations
 * @apiDescription Provides a list of measurement locations and their meta data.
 *
 * @apiParam {string or string[]} [city] Limit results by one or more cities (ex. `city[]=Lisboa&city[]=Porto`)
 * @apiParam {string} [country] Limit results by one or more countries (ex. `country[]=NL&country[]=PL`)
 * @apiParam {string} [location] Limit results by one or more locations (ex. `location[]=Reja&location[]=Nijmegen-Graafseweg`)
 * @apiParam {string=pm25, pm10, so2, no2, o3, co, bc} [parameter] Limit to certain one or more parameters (ex. `parameter=pm25` or `parameter[]=co&parameter[]=pm25`)
 * @apiParam {boolean} [has_geo] Filter out items that have or do not have geographic information.
 * @apiParam {string} [coordinates] Center point (`lat, lon`) used to get locations within/near a certain area. (ex. `coordinates=40.23,34.17`). Must be used with `order_by=distance` or `radius=2500`, otherwise won't affect query.
 * @apiParam {number} [nearest] DEPRECATED: Use `order_by=distance` with `limit=X` instead.
 * @apiParam {number} [radius=2500] Radius (in meters) used to get locations within a certain area, must be used with `coordinates`.
 * @apiParam {string[]} [order_by=location] Order by one or more fields (ex. `order_by=count` or `order_by[]=country&order_by[]=count`).
 * @apiParam {string[]} [sort=asc] Define sort order for one or more fields (ex. `sort=desc` or `sort[]=asc&sort[]=desc`).
 * @apiParam {number} [limit=100] Change the number of results returned, max is 10000.
 * @apiParam {number} [page=1] Paginate through results.
 *
 * @apiSuccess {string}   location      Location identifier
 * @apiSuccess {string}   country       Country containing location in 2 letter ISO code
 * @apiSuccess {string}   city          City containing location
 * @apiSuccess {number}   count         Number of measurements, cumulative by specificity level
 * @apiSuccess {number}   distance      Distance to the specified coordinates (present when `nearest` and `coordinates` parameters are used, measured by meters)
 * @apiSuccess {string}   sourceName    Can follow this to determine active adapter used for this location
 * @apiSuccess {array}    sourceNames   Array of sourceName, both active and unused ones
 * @apiSuccess {date}     firstUpdated  When was data first grabbed for this location (in UTC)?
 * @apiSuccess {date}     lastUpdated   When was data last grabbed for this location (in UTC)?
 * @apiSuccess {array}    parameters    List of parameters present for this location
 * @apiSuccess {object}   coordinates   Coordinates of location
 * @apiSuccessExample {json} Success Response:
 * [
 *   {
 *     "count": 4242,
 *     "sourceName": "Australia - New South Wales",
 *     "firstUpdated": "2015-10-13T01:00:00.000Z",
 *     "lastUpdated": "2015-11-14T03:00:00.000Z",
 *     "parameters": [
 *       "pm25",
 *       "pm10",
 *       "so2",
 *       "co",
 *       "no2",
 *       "o3"
 *     ],
 *     "country": "AU",
 *     "city": "Central Coast",
 *     "location": "Wyong"
 *   },
 *   {
 *     "count": 728,
 *     "sourceName": "Australia - New South Wales",
 *     "firstUpdated": "2015-10-13T01:00:00.000Z",
 *     "lastUpdated": "2015-11-14T03:00:00.000Z",
 *     "parameters": [
 *       "pm10"
 *     ],
 *     "country": "AU",
 *     "city": "Central Tablelands",
 *     "location": "Bathurst"
 *   },
 *   ...
 * ]
 *
 * @apiError statusCode     The error code
 * @apiError error          Error name
 * @apiError message        Error message
 * @apiErrorExample {json} Error Response:
 *     HTTP/1.1 400 Bad Request
 *     {
 *      "statusCode": 400,
 *      "error": "Bad Request",
 *      "message": "Oops!"
 *     }
 */
module.exports = [
  {
    method: ['GET'],
    path: '/v1/locations',
    config: {
      description: 'An aggregation of the data for each location.',
      validate: {
        query: {
          city: [Joi.string(), Joi.array().items(Joi.string())],
          coordinates: Joi.string().regex(lonLatRegex),
          country: [Joi.string(), Joi.array().items(Joi.string())],
          has_geo: Joi.boolean(),
          limit: Joi.number()
            .default(defaultRequestLimit)
            .max(maxRequestLimit),
          location: [Joi.string(), Joi.array().items(Joi.string())],
          name: [Joi.string(), Joi.array().items(Joi.string())],
          order_by: [
            Joi.string().valid(orderableColumns),
            Joi.array().items(Joi.string().valid(orderableColumns))
          ],
          page: Joi.number(),
          parameter: [Joi.string(), Joi.array().items(Joi.string())],
          radius: Joi.number(),
          sort: [
            Joi.string().valid('asc', 'desc'),
            Joi.array().items(Joi.string().valid('asc', 'desc'))
          ]
        }
      }
    },
    handler: async function (request, reply) {
      try {
        const { query, page, limit } = request;
        const {
          city,
          coordinates,
          country,
          has_geo: hasGeo,
          location,
          order_by,
          sort,
          parameter,
          radius
        } = query;
        const selectedColumns = ['*'];
        const offset = (page - 1) * limit;

        /*
         * Handle sorting
         */
        let orderBy;
        let sortBy = sort ? [].concat(sort) : [];

        // eslint-disable-next-line
        if (typeof order_by !== 'undefined') {
          // Map orderBy as described in: https://knexjs.org/#Builder-orderBy
          orderBy = [].concat(order_by).map((column, i) => {
            // If 'distance' is an order parameter, calculate it for each field
            if (column === 'distance') {
              if (coordinates) {
                const [lat, lon] = coordinates.split(',');
                selectedColumns.push(
                  db.raw(`
                    ST_Distance(
                      'SRID=4326;POINT(${lon} ${lat})'::geography,
                      coordinates::geography
                    ) as distance
                  `)
                );
              } else {
                reply(
                  Boom.badRequest(
                    'Parameter "coordinates" must be set when ordering by distance.'
                  )
                );
              }
            }

            return {
              column,
              order: sortBy[i] || 'asc'
            };
          });
        } else {
          // Default sort order
          orderBy = ['country', 'city', 'location'];
        }

        /*
         * Build base query, to be used to fetch results and total count.
         */
        const dbQuery = db('locations').where(builder => {
          if (country) {
            builder.where('country', 'IN', [].concat(country));
          }

          if (city) {
            builder.where('city', '&&', [].concat(city));
          }

          if (location) {
            builder.where('location', '&&', [].concat(location));
          }

          if (parameter) {
            builder.where('parameters', '&&', [].concat(parameter));
          }

          if (typeof hasGeo !== 'undefined') {
            hasGeo
              ? builder.whereNotNull('coordinates')
              : builder.whereNull('coordinates');
          }

          if (typeof radius !== 'undefined') {
            if (coordinates) {
              const [lat, lon] = coordinates.split(',');
              builder.whereRaw(`ST_DWithin(
                  coordinates, 
                  ST_MakePoint(
                    ${parseFloat(lon)},${parseFloat(lat)}), 
                    ${radius || defaultGeoRadius}
                  )
                `);
            } else {
              reply(
                Boom.badRequest(
                  '"coordinates" must be passed with "radius" parameter.'
                )
              );
            }
          }
        });

        /*
         * Fetch results
         */
        const results = await dbQuery
          .clone()
          .select(selectedColumns)
          .offset(offset)
          .orderBy(orderBy)
          .limit(limit)
          .map(l => {
            l.lat !== null ? (l.lat = parseFloat(l.lat)) : null;
            l.lon !== null ? (l.lon = parseFloat(l.lon)) : null;
            return l;
          });

        /*
         * Fetch total count
         */
        request.count = parseInt((await dbQuery.count('id').first()).count);

        /*
         * Return results
         */
        reply(results);
      } catch (err) {
        // Unexpected error, log message internally.
        log(['error'], err);
        reply(Boom.badImplementation(err.message));
      }
    }
  }
];

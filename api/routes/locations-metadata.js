'use strict';
import Boom from 'boom';
import config from 'config';
import _ from 'lodash';
import Joi from 'joi';
import { db } from '../services/db';
import { log } from '../services/logger';
import { lonLatRegex } from '../../lib/utils';
import metadataSchema from '../../lib/location-metadata-schema';

const defaultGeoRadius = config.get('geoRadius');
const maxRequestLimit = config.get('maxRequestLimit');
const defaultRequestLimit = config.get('defaultRequestLimit');
const orderableColumns = ['city', 'country', 'location', 'distance', 'count'];
const { strategy: authStrategy } = config.get('auth');

async function checkLocation (id) {
  // Check if the location exists.
  const location = await db('locations')
    .select('id')
    .where('id', id)
    .first();

  return !!location;
}

/**
 * @api {get} /locations/metadata GET
 * @apiGroup Locations
 */
module.exports = [
  {
    method: ['GET'],
    path: '/v1/locations/metadata',
    config: {
      description: 'List of location metadata objects',
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
            // Ensure city is an array type, to perform map
            const cities = [].concat(city);

            // Transform "cities" field into string and search in it
            builder.whereRaw(
              cities
                .map(c => "lower(array_to_string(cities,' ')) like ?")
                .join(' OR '),
              cities.map(c => `%${c.toLowerCase()}%`)
            );
          }

          if (location) {
            // Ensure location is an array, to perform map
            const locations = [].concat(location);

            // Transform "cities" field into string and search in it
            builder.whereRaw(
              locations
                .map(l => "lower(array_to_string(locations,' ')) like ?")
                .join(' OR '),
              locations.map(l => `%${l.toLowerCase()}%`)
            );
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
          .offset(offset)
          .orderBy(orderBy)
          .limit(limit)
          .leftJoin(
            db('latest_locations_metadata')
              .select(['locationId', 'userId', 'data'])
              .as('latest_locations_metadata'),
            'locations.id',
            'latest_locations_metadata.locationId'
          )
          .map(l => {
            if (l.lat !== null) {
              l.lat = parseFloat(l.lat);
            }

            if (l.lon !== null) {
              l.lon = parseFloat(l.lon);
            }

            // Set coordinates as GeoJSON Feature
            if (typeof l.lon !== 'undefined' && typeof l.lat !== 'undefined') {
              l.coordinates = {
                longitude: l.lon,
                latitude: l.lat
              };

              delete l.lon;
              delete l.lat;
            }

            return l;
          });

        /*
         * Fetch total count
         */
        request.count = parseInt((await dbQuery.count('locations.id').first()).count);

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
  },
  {
    method: ['GET'],
    path: '/v1/locations/{id}/metadata',
    config: {
      description: 'Metadata associated with a given location'
    },
    handler: async function (request, reply) {
      try {
        const res = await db('latest_locations_metadata')
          .select()
          .where('locationId', request.params.id)
          .first();

        // Check if the metadata exists.
        if (!res) {
          return reply(Boom.notFound('Location metadata was not found'));
        }

        reply(res);
      } catch (err) {
        /*
         * Unexpected error, log message internally.
         */
        reply(Boom.badImplementation(err.message));
      }
    }
  },
  {
    method: ['PUT'],
    path: '/v1/locations/{id}/metadata',
    config: {
      description: 'Updates the metadata associated with a given location',
      auth: authStrategy,
      validate: {
        payload: metadataSchema
      }
    },
    handler: async function (request, reply) {
      try {
        // Check if the location exists.
        if (!(await checkLocation(request.params.id))) {
          return reply(Boom.notFound('This location does not exist'));
        }

        const user = _.get(request, 'auth.credentials.sub', 'anonymous');

        const res = await db.transaction(async trx => {
          const [insertId] = await trx('locations_metadata')
            .returning('id')
            .insert({
              userId: user,
              locationId: request.params.id,
              data: request.payload
            });

          // Get result after insertion.
          return trx('latest_locations_metadata')
            .select()
            .where('id', insertId)
            .first();
        });

        reply(res);
      } catch (err) {
        /*
         * Unexpected error, log message internally.
         */
        reply(Boom.badImplementation(err.message));
      }
    }
  }
];

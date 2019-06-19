'use strict';
import Boom from 'boom';
import config from 'config';
import _ from 'lodash';
import Joi from 'joi';

import { db } from '../services/db';
import metadataSchema from '../../lib/location-metadata-schema';

const maxRequestLimit = config.get('maxRequestLimit');
const defaultRequestLimit = config.get('defaultRequestLimit');
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
          country: [Joi.string(), Joi.array().items(Joi.string())],
          limit: Joi.number()
            .default(defaultRequestLimit)
            .max(maxRequestLimit),
          location: [Joi.string(), Joi.array().items(Joi.string())],
          name: [Joi.string(), Joi.array().items(Joi.string())],
          page: Joi.number(),
          parameter: [Joi.string(), Joi.array().items(Joi.string())]
        }
      }
    },
    handler: async function (request, reply) {
      try {
        const { query, page, limit } = request;
        const { country, parameter } = query;
        const offset = (page - 1) * limit;

        /*
         * Build base query, to be used to fetch results and total count.
         */
        const dbQuery = db('latest_locations_metadata').where(builder => {
          if (country) {
            builder.whereRaw('data->>country', 'IN', [].concat(country));
          }

          if (parameter) {
            builder.where('data->>parameters', '&&', [].concat(parameter));
          }
        });

        /*
         * Fetch results
         */
        const results = await dbQuery
          .clone()
          .select('*')
          .offset(offset)
          .limit(limit);

        /*
         * Fetch total count
         */
        request.count = parseInt((await dbQuery.count('id').first()).count);

        reply(results);
      } catch (err) {
        /*
         * Unexpected error, log message internally.
         */
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

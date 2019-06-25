'use strict';
import Boom from 'boom';
import config from 'config';
import _ from 'lodash';

import { db } from '../services/db';
import metadataSchema, { computeCompleteness } from '../../lib/location-metadata-schema';

const { strategy: authStrategy } = config.get('auth');

async function checkLocation (id) {
  // Check if the location exists.
  const location = await db('locations')
    .select('id')
    .where('id', id)
    .first();

  return !!location;
}

module.exports = [
  /**
   * @api {put} /locations/metadata PUT
   * @apiGroup Locations
   * @apiDescription Allows the user to update the metadata for a given location.
   */
  {
    method: ['PUT'],
    path: '/v1/locations/{id}/metadata',
    config: {
      description: 'Updates the metadata associated with a given location',
      // auth: authStrategy,
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
              data: request.payload,
              completeness: computeCompleteness(request.payload)
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

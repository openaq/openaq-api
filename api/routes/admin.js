'use strict';
import boom from 'boom';
import config from 'config';
import Joi from 'joi';
import { startLocationsUpdate } from '../services/locations-update';

const adminToken = config.get('adminToken');

module.exports = [
  {
    method: ['GET'],
    path: '/admin/update-locations',
    config: {
      description: 'Update locations from measurement data.',
      validate: {
        query: {
          adminToken: Joi.string()
        }
      }
    },
    handler: function (request, reply) {
      try {
        const { adminToken: queryAdminToken } = request.query;

        if (!queryAdminToken) {
          return reply(boom.badRequest('Parameter "adminToken" is required.'));
        }

        if (adminToken !== queryAdminToken) {
          return reply(boom.badRequest('Invalid parameter "adminToken".'));
        }

        startLocationsUpdate();

        return reply({});
      } catch (err) {
        return reply(boom.badImplementation(err));
      }
    }
  }
];

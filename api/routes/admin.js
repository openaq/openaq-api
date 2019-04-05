'use strict';
import boom from 'boom';
import config from 'config';
import Joi from 'joi';
import { fetchLocations } from '../services/locations';

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
      const { adminToken: queryAdminToken } = request.query;

      if (!queryAdminToken) {
        return reply(boom.badRequest('Parameter "adminToken" is required.'));
      }

      if (adminToken !== queryAdminToken) {
        return reply(boom.badRequest('Invalid parameter "adminToken".'));
      }

      fetchLocations();

      return reply({});
    }
  }
];

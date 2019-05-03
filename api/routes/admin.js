'use strict';
import boom from 'boom';
import config from 'config';
import Joi from 'joi';
import { startAthenaSyncTask } from '../services/athena-sync';

const adminToken = config.get('adminToken');

module.exports = [
  {
    method: ['GET'],
    path: '/admin/athena-sync',
    config: {
      description:
        'Update locations and cities from measurement data on Athena .',
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

        startAthenaSyncTask();

        return reply({});
      } catch (err) {
        return reply(boom.badImplementation(err));
      }
    }
  }
];

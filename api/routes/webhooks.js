'use strict';

var Boom = require('boom');
var c = require('../controllers/webhooks.js');
import { log } from '../services/logger';

module.exports = [
  {
    method: ['POST'],
    path: '/v1/webhooks',
    handler: function (request, reply) {
      var redis = request.server.plugins['hapi-redis'].client;
      var payload = request.payload;

      // Handle it
      c.handleAction(payload, redis, function (err, records, count) {
        if (err) {
          log(['error'], err);
          return reply(Boom.badRequest(err.error));
        }

        return reply();
      });
    }
  }
];

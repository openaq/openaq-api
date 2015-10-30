'use strict';

var Boom = require('boom');
var c = require('../controllers/webhooks.js');

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
          console.error(err);
          return reply(Boom.badImplementation(err));
        }

        return reply();
      });
    }
  }
];

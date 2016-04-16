'use strict';

var Boom = require('boom');
var m = require('../controllers/sources.js');

module.exports = [
  {
    method: ['GET'],
    path: '/v1/sources',
    config: {
      description: 'See information on platform sources.'
    },
    handler: function (request, reply) {
      var params = {};

      // For GET
      if (request.query) {
        params = request.query;
      }

      // Set max limit to 1000
      request.limit = Math.min(request.limit, 1000);

      // Handle it
      m.query(params, request.page, request.limit, function (err, records, count) {
        if (err) {
          return reply(Boom.badImplementation(err));
        }

        request.count = count;
        return reply(records);
      });
    }
  }
];

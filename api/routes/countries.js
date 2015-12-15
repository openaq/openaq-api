'use strict';

var Boom = require('boom');
var m = require('../controllers/countries.js');

/**
 * @api {get} /countries GET
 * @apiGroup Countries
 * @apiDescription Providing a simple listing of countries within the platform.
 *
 *
 * @apiSuccess {string}   code     2 digit ISO country code containing measurement
 * @apiSuccess {string}   name     Nicer country name
 * @apiSuccess {string}   count    Number of measurements for the country
 * @apiSuccessExample {json} Success Response:
 * [
 *   {
 *     "count": 40638,
 *     "code": "AU",
 *     "name": "Australia"
 *   },
 *   {
 *     "count": 78681,
 *     "code": "BR",
 *     "name": "Brazil"
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
    path: '/v1/countries',
    handler: function (request, reply) {
      var params = {};

      // For GET
      if (request.query) {
        params = request.query;
      }

      // Don't use a limit for this endpoint
      request.limit = undefined;

      // Handle it
      var redis = request.server.plugins['hapi-redis'].client;
      m.query(params, redis, true, function (err, records, count) {
        if (err) {
          console.error(err);
          return reply(Boom.badImplementation(err));
        }

        request.count = count;
        return reply(records);
      });
    }
  }
];

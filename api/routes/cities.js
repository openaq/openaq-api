'use strict';

var Boom = require('boom');
var m = require('../controllers/cities.js');

/**
 * @api {get} /cities GET
 * @apiGroup Cities
 * @apiDescription Providing a simple listing of cities within the platform.
 *
 * @apiParam {string} [country] Limit results by a certain country.
 *
 * @apiSuccess {string}   country     2 digit ISO country code containing measurement
 * @apiSuccess {string}   locations   Number of locations in this city
 * @apiSuccess {string}   count       Number of measurements for this city
 * @apiSuccess {string}   city        Name of the city
 * @apiSuccessExample {json} Success Response:
 *   [
 *     {
 *       "locations": 14,
 *       "count": 21301,
 *       "country": "NL",
 *       "city": "Amsterdam"
 *     },
 *     {
 *       "locations": 1,
 *       "count": 2326,
 *       "country": "NL",
 *       "city": "Badhoevedorp"
 *     },
 *     ...
 *   ]
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
    path: '/v1/cities',
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

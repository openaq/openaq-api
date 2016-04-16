'use strict';

var Boom = require('boom');
var m = require('../controllers/sources.js');
import { log } from '../services/logger';

/**
 * @api {get} /sources GET
 * @apiGroup Sources
 * @apiDescription Provides a simple listing of sources within the platform.
 *
 * @apiParam {string} [country] Limit results by a certain country.
 *
 * @apiSuccess {string}   country     Country containing city, in 2 letter ISO code
 * @apiSuccess {string}   sourceName  Source name identifier
 * @apiSuccess {number}   locations   Number of locations in this city
 * @apiSuccess {number}   count       Number of measurements for this city
 * @apiSuccessExample {json} Success Response:
 *
 *   [
 *     {
 *       "country": "MN",
 *       "sourceName": "Agaar.mn",
 *       "locations": 9,
 *       "count": 21301
 *     },
 *     {
 *       "country": "MN",
 *       "sourceName": "StateAir_Ulaanbaatar",
 *       "locations": 1,
 *       "count": 2326
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
    path: '/v1/sources',
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
      m.query(params, redis, function (err, records, count) {
        if (err) {
          log(['error'], err);
          return reply(Boom.badImplementation(err));
        }

        request.count = count;
        return reply(records);
      });
    }
  }
];

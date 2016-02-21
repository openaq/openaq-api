'use strict';

var Boom = require('boom');
var m = require('../controllers/cities.js');
import { log } from '../services/logger';

/**
 * @api {get} /cities GET
 * @apiGroup Cities
 * @apiDescription Provides a simple listing of cities within the platform.
 *
 * @apiParam {string} [country] Limit results by a certain country.
 *
 * @apiSuccess {string}   city        Name of the city
 * @apiSuccess {string}   country     Country containing city, in 2 letter ISO code
 * @apiSuccess {number}   count       Number of measurements for this city
 * @apiSuccess {number}   locations   Number of locations in this city
 * @apiSuccessExample {json} Success Response:
 *
 *   [
 *     {
 *       "city": "Amsterdam",
 *       "country": "NL",
 *       "count": 21301,
 *       "locations": 14
 *     },
 *     {
 *       "city": "Badhoevedorp",
 *       "country": "NL",
 *       "count": 2326,
 *       "locations": 1
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
      m.query(params, function (err, records, count) {
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

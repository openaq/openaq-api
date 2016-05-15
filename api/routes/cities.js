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
 * @apiParam {number} [limit=100] Change the number of results returned, max is 1000.
 * @apiParam {number} [page=1] Paginate through results.
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
    config: {
      description: 'An aggregation of cities included in platform.'
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
          log(['error'], err);
          return reply(Boom.badImplementation(err));
        }

        request.count = count;
        return reply(records);
      });
    }
  }
];

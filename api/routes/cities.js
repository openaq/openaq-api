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
 * @apiParam {string[]} [order_by=country] Order by one or more fields (ex. `order_by=country` or `order_by[]=country&order_by[]=locations`).
 * @apiParam {string[]} [sort=asc] Define sort order for one or more fields (ex. `sort=desc` or `sort[]=asc&sort[]=desc`).
 * @apiParam {number} [limit=100] Change the number of results returned, max is 10000.
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

      // Set max limit based on env var or default to 10000
      request.limit = Math.min(request.limit, process.env.REQUEST_LIMIT || 10000);

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

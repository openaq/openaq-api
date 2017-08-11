'use strict';

var Boom = require('boom');
var m = require('../controllers/countries.js');
import { log } from '../services/logger';

/**
 * @api {get} /countries GET
 * @apiGroup Countries
 * @apiDescription Provides a simple listing of countries within the platform.
 *
 * @apiParam {string[]} [order_by=name] Order by one or more fields (ex. `order_by=cities` or `order_by[]=cities&order_by[]=locations`).
 * @apiParam {string[]} [sort=asc] Define sort order for one or more fields (ex. `sort=desc` or `sort[]=asc&sort[]=desc`).
 * @apiParam {number} [limit=100] Change the number of results returned, max is 10000.
 * @apiParam {number} [page=1] Paginate through results.
 *
 * @apiSuccess {string}   code      2 letter ISO code
 * @apiSuccess {string}   name      Country name
 * @apiSuccess {number}   count     Number of measurements for the country
 * @apiSuccess {number}   cities    Number of cities in this country
 * @apiSuccess {number}   locations Number of locations in this country
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
    config: {
      description: 'An aggregation of countries included in platform.'
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

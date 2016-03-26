'use strict';

var Boom = require('boom');
var m = require('../controllers/countries.js');
import { log } from '../services/logger';

/**
 * @api {get} /countries GET
 * @apiGroup Countries
 * @apiDescription Provides a simple listing of countries within the platform.
 *
 * @apiSuccess {string}   code     2 letter ISO code
 * @apiSuccess {string}   name     Country name
 * @apiSuccess {number}   count    Number of measurements for the country
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

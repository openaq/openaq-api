'use strict';

var Boom = require('boom');
var m = require('../controllers/latest.js');
import { log } from '../services/logger';

/**
 * @api {get} /latest GET
 * @apiGroup Latest
 * @apiDescription Provides the latest value of each available parameter for every location in the system.
 *
 * @apiParam {string} [city] Limit results by a certain city.
 * @apiParam {string} [country] Limit results by a certain country.
 * @apiParam {string} [location] Limit results by a certain location.
 * @apiParam {string=pm25, pm10, so2, no2, o3, co, bc} [parameter] Limit to only a certain parameter.
 * @apiParam {boolean} [has_geo] Filter out items that have or do not have geographic information.
 * @apiParam {string} [coordinates] Center point (`lat, lon`) used to get measurements within a certain area. (ex. `coordinates=40.23,34.17`) Will add `distance` property.
 * @apiParam {number} [radius=2500] Radius (in meters) used to get measurements within a certain area, must be used with `coordinates`.
 * @apiParam {string[]} [order_by=location] Order by one or more fields (ex. `order_by=country` or `order_by[]=country&order_by[]=city`).
 * @apiParam {string[]} [sort=asc] Define sort order for one or more fields (ex. `sort=desc` or `sort[]=asc&sort[]=desc`).
 * @apiParam {number} [limit=100] Change the number of results returned, max is 10000.
 * @apiParam {number} [page=1] Paginate through results.
 *
 * @apiSuccess {string}   location      Location identifier.
 * @apiSuccess {string}   country       Country containing measurement in 2 letter ISO code.
 * @apiSuccess {string}   city          City containing location.
 * @apiSuccess {array}    measurements  An array of the latest measurements for each parameter for this location.
 * @apiSuccessExample
 *       HTTP/1.1 200 OK
 *       "results": [
 *        {
 *          "location": "Punjabi Bagh",
 *          "city": "Delhi",
 *          "country": "IN",
 *          "measurements": [
 *            {
 *              "parameter": "so2",
 *              "value": "7.8",
 *              "lastUpdated": "2015-07-24T11:30:00.000Z",
 *              "unit": "µg/m3",
 *              "sourceName": "Punjabi Bagh",
 *              "averagingPeriod": {
 *                "unit": "hours",
 *                "value": 0.25
 *              }
 *             },
 *             {
 *               "parameter": "co",
 *               "value": 1.3,
 *               "lastUpdated": "2015-08-18T23:30:00.000Z",
 *               "unit": "mg/m3",
 *               "sourceName": "CPCB",
 *               "averagingPeriod": {
 *                 "unit": "hours",
 *                 "value": 0.25
 *               }
 *             },
 *             {
 *               "parameter": "pm25",
 *               "value": 79,
 *               "lastUpdated": "2015-10-02T21:45:00.000Z",
 *               "unit": "µg/m3",
 *               "sourceName": "CPCB",
 *               "averagingPeriod": {
 *                 "unit": "hours",
 *                 "value": 0.25
 *               }
 *             }
 *           ]
 *             ...
 *         }
 *      ]
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
    path: '/v1/latest',
    config: {
      description: 'An aggregation of the latest measurements for each location.'
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

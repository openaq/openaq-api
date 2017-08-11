'use strict';

var Boom = require('boom');
var m = require('../controllers/locations.js');
import { log } from '../services/logger';

/**
 * @api {get} /locations GET
 * @apiGroup Locations
 * @apiDescription Provides a list of measurement locations and their meta data.
 *
 * @apiParam {string} [city] Limit results by one or more cities (ex. `city[]=Lisboa&city[]=Porto`)
 * @apiParam {string} [country] Limit results by one or more countries (ex. `country[]=NL&country[]=PL`)
 * @apiParam {string} [location] Limit results by one or more locations (ex. `location[]=Reja&location[]=Nijmegen-Graafseweg`)
 * @apiParam {string=pm25, pm10, so2, no2, o3, co, bc} [parameter] Limit to certain one or more parameters (ex. `parameter=pm25` or `parameter[]=co&parameter[]=pm25`)
 * @apiParam {boolean} [has_geo] Filter out items that have or do not have geographic information.
 * @apiParam {string} [coordinates] Center point (`lat, lon`) used to get locations within/near a certain area. (ex. `coordinates=40.23,34.17`)
 * @apiParam {number} [nearest] Get the X nearest locations to coordinates, must be used with `coordinates`. Wins over `radius` if both are present. Will add `distance` property to locations.
 * @apiParam {number} [radius=2500] Radius (in meters) used to get locations within a certain area, must be used with `coordinates`.
 * @apiParam {string[]} [order_by=location] Order by one or more fields (ex. `order_by=count` or `order_by[]=country&order_by[]=count`).
 * @apiParam {string[]} [sort=asc] Define sort order for one or more fields (ex. `sort=desc` or `sort[]=asc&sort[]=desc`).
 * @apiParam {number} [limit=100] Change the number of results returned, max is 10000.
 * @apiParam {number} [page=1] Paginate through results.
 *
 * @apiSuccess {string}   location      Location identifier
 * @apiSuccess {string}   country       Country containing location in 2 letter ISO code
 * @apiSuccess {string}   city          City containing location
 * @apiSuccess {number}   count         Number of measurements, cumulative by specificity level
 * @apiSuccess {number}   distance      Distance to the specified coordinates (present when `nearest` and `coordinates` parameters are used, measured by meters)
 * @apiSuccess {string}   sourceName    Can follow this to determine active adapter used for this location
 * @apiSuccess {array}    sourceNames   Array of sourceName, both active and unused ones
 * @apiSuccess {date}     firstUpdated  When was data first grabbed for this location (in UTC)?
 * @apiSuccess {date}     lastUpdated   When was data last grabbed for this location (in UTC)?
 * @apiSuccess {array}    parameters    List of parameters present for this location
 * @apiSuccess {object}   coordinates   Coordinates of location
 * @apiSuccessExample {json} Success Response:
 * [
 *   {
 *     "count": 4242,
 *     "sourceName": "Australia - New South Wales",
 *     "firstUpdated": "2015-10-13T01:00:00.000Z",
 *     "lastUpdated": "2015-11-14T03:00:00.000Z",
 *     "parameters": [
 *       "pm25",
 *       "pm10",
 *       "so2",
 *       "co",
 *       "no2",
 *       "o3"
 *     ],
 *     "country": "AU",
 *     "city": "Central Coast",
 *     "location": "Wyong"
 *   },
 *   {
 *     "count": 728,
 *     "sourceName": "Australia - New South Wales",
 *     "firstUpdated": "2015-10-13T01:00:00.000Z",
 *     "lastUpdated": "2015-11-14T03:00:00.000Z",
 *     "parameters": [
 *       "pm10"
 *     ],
 *     "country": "AU",
 *     "city": "Central Tablelands",
 *     "location": "Bathurst"
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
    path: '/v1/locations',
    config: {
      description: 'An aggregation of the data for each location.'
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

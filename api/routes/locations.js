'use strict';

var Boom = require('boom');
var m = require('../controllers/locations.js');

/**
 * @api {get} /locations GET
 * @apiGroup Locations
 * @apiDescription Providing data about distinct measurement locations, this is
 * a list containing metadata about the location..
 *
 * @apiParam {string} [city] Limit results by a certain city.
 * @apiParam {string} [country] Limit results by a certain country.
 * @apiParam {string} [location] Limit results by a certain location.
 * @apiParam {string} [parameter] Limit to only a certain parameter (valid values are pm25, pm10, so2, no2, o3, co and bc).
 * @apiParam {boolean} [has_geo] Filter out items that have or do not have geographic information.
 * @apiParam {number} [value_from] Show results above value threshold, useful in combination with `parameter`.
 * @apiParam {number} [value_to] Show results below value threshold, useful in combination with `parameter`.
 * @apiParam {date} [date_from] Show results after a certain date. (ex. `2015-12-20`)
 * @apiParam {date} [date_to] Show results before a certain date. (ex. `2015-12-20`)
 *
 * @apiSuccess {string}   location      Location description for measurement
 * @apiSuccess {string}   country       2 digit country code containing measurement
 * @apiSuccess {string}   city          City containing measurement
 * @apiSuccess {number}   count         Number of measurements, cumulative by specificity level
 * @apiSuccess {string}   sourceName    Can follow this to determine which adapter is used for this location
 * @apiSuccess {date}     firstUpdated  When was data first grabbed for this location (in UTC)?
 * @apiSuccess {date}     lastUpdated   When was data last grabbed for this location (in UTC)?
 * @apiSuccess {array}    parameters    List of parameters present for this location
 * @apiSuccess {string}   _id           Unique ID
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

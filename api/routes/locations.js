'use strict';

var Boom = require('boom');
var m = require('../controllers/locations.js');

/**
 * @api {get} /locations GET
 * @apiGroup Locations
 * @apiDescription Providing data about distinct measurement locations, this is
 * a nested list reflecting the country-city-location relationship, `count` and
 * `lastUpdated` are calculated from all children.
 *
 * @apiParam {number} [limit=500] Change the number of results returned, max is 100.
 * @apiParam {number} [page=1] Paginate through results.
 * @apiParam {number} [skip] Number of records to skip.
 *
 * @apiSuccess {string}   location      Location description for measurement
 * @apiSuccess {string}   country       2 digit country code containing measurement
 * @apiSuccess {string}   city       City containing measurement
 * @apiSuccess {number}   count         Number of measurements, cumulative by specificity level
 * @apiSuccess {string}   _id            Unique ID
 * @apiSuccessExample {date} lastUpdated    The last update time for this specificity level.
 *       HTTP/1.1 200 OK
 *       [
 *         {
 *         "country": "UK",
 *         "cities": [
 *           {
 *           "city": "London",
 *           "locations": [
 *             {
 *               "location": "London Harrow Stanmore",
 *               "count": 1,
 *               "lastUpdated": "2015-08-23T16:00:00.000Z"
 *             },
 *             {
 *               "location": "Southwark A2 Old Kent Road",
 *               "count": 4,
 *               "lastUpdated": "2015-08-23T16:00:00.000Z"
 *             }
 *           ],
 *           ...
 *           "count": 68,
 *           "lastUpdated": "2015-08-23T16:00:00.000Z"
 *         ],
 *         "count": 68,
 *         "lastUpdated": "2015-08-23T16:00:00.000Z"
 *       ]
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

      // Set max limit to 500 for now
      request.limit = 500;

      // Handle it
      m.query(params, request.page, request.limit, function (err, records, count) {
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

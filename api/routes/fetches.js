'use strict';

var Boom = require('boom');
var m = require('../controllers/fetches.js');

/**
 * @api {get} v1/fetches GET
 * @apiGroup Fetches
 * @apiDescription Providing data about individual fetch operations that are
 * used to populate data in the platform.
 *
 * @apiParam {string[]} [order_by=timeStarted] Order by one or more fields (ex. `order_by=timeEnded` or `order_by[]=timeEnded&order_by[]=count`).
 * @apiParam {string[]} [sort=asc] Define sort order for one or more fields (ex. `sort=desc` or `sort[]=asc&sort[]=desc`).
 * @apiParam {number} [limit=100] Change the number of results returned, max is 10000.
 * @apiParam {number} [page=1] Paginate through results.
 *
 * @apiSuccess {datetime}   timeStarted     Start time of fetch task in UTC
 * @apiSuccess {datetime}   timeEnded       End time of fetch task in UTC
 * @apiSuccess {number}     count           Count of new, inserted measurements
 * @apiSuccess {object}     results         JSON containing metadata for each source fetch task
 * @apiSuccessExample {json} Success Response:
 *      HTTP/1.1 200 OK
 *      {
 *        "meta": {
 *          "name": "openaq-api",
 *          "license": "CC BY 4.0",
 *          "website": "https://docs.openaq.org/",
 *          "page": 1,
 *          "limit": 100,
 *          "found": 3
 *        },
 *        "results": [
 *          {
 *            "count": 0,
 *            "results": [
 *              {
 *                "message": "New measurements inserted for Mandir Marg: 1",
 *                "failures": {},
 *                "count": 0,
 *                "duration": 0.153,
 *                "sourceName": "Mandir Marg"
 *              },
 *              {
 *                "message": "New measurements inserted for Sao Paulo: 1898",
 *                "failures": {},
 *                "count": 1898,
 *                "duration": 16.918,
 *                "sourceName": "Sao Paulo"
 *              },
 *              {
 *                "message": "New measurements inserted for Chile - SINCA: 244",
 *                "failures": {},
 *                "count": 244,
 *                "duration": 2.019,
 *                "sourceName": "Chile - SINCA"
 *              },
 *              {
 *                "message": "New measurements inserted for Thailand: 184",
 *                "failures": {
 *                  "measurement is too old to insert": 24
 *                },
 *                "count": 184,
 *                "duration": 2.751,
 *                "sourceName": "Thailand"
 *              }
 *            ],
 *            "timeStarted": "2016-02-07T15:25:04.603Z",
 *            "timeEnded": "2016-02-07T15:25:04.793Z"
 *          }
 *        ]
 *      }
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
    path: '/v1/fetches',
    config: {
      description: 'See history of data update attempts by the platform.'
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
          return reply(Boom.badImplementation(err));
        }

        request.count = count;
        return reply(records);
      });
    }
  }
];

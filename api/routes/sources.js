'use strict';

var Boom = require('boom');
var m = require('../controllers/sources.js');

/**
 * @api {get} /sources GET
 * @apiGroup Sources
 * @apiDescription Provides a list of data sources.
 *
 * @apiParam {string[]} [order_by=name] Order by one or more fields (ex. `order_by=country` or `order_by[]=active&order_by[]=country`).
 * @apiParam {string[]} [sort=asc] Define sort order for one or more fields (ex. `sort=desc` or `sort[]=asc&sort[]=desc`).
 * @apiParam {number} [limit=100] Change the number of results returned, max is 10000.
 * @apiParam {number} [page=1] Paginate through results.
 *
 * @apiSuccess {string}   url         The actual data source URL
 * @apiSuccess {string}   adapter     Name of adapter that collects data from source
 * @apiSuccess {string}   name        Source name
 * @apiSuccess {string}   city        City where data is gathered
 * @apiSuccess {string}   country     Country where data is gathered
 * @apiSuccess {string}   description Description of the data source
 * @apiSuccess {string}   resolution  Source update frequency (deprecated)
 * @apiSuccess {string}   sourceURL   A related URL about the source
 * @apiSuccess {string[]} contacts    Addresses you may send inquiries about the source
 * @apiSuccess {boolean}  active      Whether the source is used at this time

 * @apiSuccessExample {json} Success Response:
 *
 * [
 *   {
 *     "url": "http://airquality.environment.nsw.gov.au/aquisnetnswphp/getPage.php?reportid=2",
 *     "adapter": "nsw",
 *     "name": "Australia - New South Wales",
 *     "city": "",
 *     "country": "AU",
 *     "description": "Measurements from the Office of Environment & Heritage of the New South Wales government.",
 *     "resolution": "1 hr",
 *     "sourceURL": "http://www.environment.nsw.gov.au/AQMS/hourlydata.htm",
 *     "contacts":
 *       [
 *         "olaf@developmentseed.org"
 *       ],
 *     "active": true
 *   },
 *   {
 *     "url": "http://stateair.net/dos/RSS/Dhaka/Dhaka-PM2.5.xml",
 *     "adapter": "stateair",
 *     "name": "StateAir_Dhaka",
 *     "city": "Dhaka",
 *     "country": "BD",
 *     "description": "",
 *     "sourceURL": "http://stateair.net/dos/",
 *     "contacts":
 *       [
 *         "info@openaq.org"
 *       ],
 *     "active": false
 *   }
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
    path: '/v1/sources',
    config: {
      description: 'See information on platform sources.'
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

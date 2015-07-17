'use strict';

var sites = require('../../sites').sites;
var _ = require('lodash');

/**
 * @api {get} /sites GET
 * @apiGroup Sites
 * @apiDescription Providing data about where the measurements come from
 *
 * @apiSuccess {string}   name        Descriptive name for location of measurement
 * @apiSuccess {string}   city        City where measurement is taken
 * @apiSuccess {string}   country     Country where measurement is taken
 * @apiSuccess {string}   description Description of instrument
 * @apiSuccess {string}   sourceURL   Source URL to find original data
 * @apiSuccessExample {json} Success Response:
 *      HTTP/1.1 200 OK
 *       {
 *       "name": "Mandir Marg",
 *       "city": "Delhi",
 *       "country": "IN",
 *       "description": "",
 *       "sourceURL": "http://www.dpccairdata.com/dpccairdata/display/mmView15MinData.php"
 *       }
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
    path: '/v1/sites',
    handler: function (request, reply) {
      // Meta fields
      request.count = sites.length;
      request.limit = undefined; // Overwrite this to hide it in meta

      // Make it a bit nicer for display
      sites = _.map(sites, function (site) {
        return _.omit(site, ['url', 'adapter', 'contacts']);
      });

      return reply(sites);
    }
  }
];

'use strict';

var sources = require('../../sources');
var _ = require('lodash');

// Flatten the sources into a single array
sources = _.chain(sources).values().flatten().value();

/**
 * @api {get} /sources GET
 * @apiGroup Sources
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
    path: '/v1/sources',
    handler: function (request, reply) {
      // Meta fields
      request.count = sources.length;
      request.limit = undefined; // Overwrite this to hide it in meta

      // Make it a bit nicer for display
      sources = _.map(sources, function (source) {
        return _.omit(source, ['url', 'adapter', 'contacts']);
      });

      return reply(sources);
    }
  }
];

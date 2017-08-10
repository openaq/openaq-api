'use strict';

import { orderBy } from 'lodash';

var p = require('../../lib/parameters.json');

/**
 * @api {get} /parameters GET
 * @apiGroup Parameters
 * @apiDescription Provides a simple listing of parameters within the platform.
 *
 * @apiSuccess {string}   id            Parameter ID
 * @apiSuccess {string}   name          The parameter name
 * @apiSuccess {number}   description   A description of the parameter
 * @apiSuccess {number}   preferredUnit The parameter's preferred unit
 * @apiSuccessExample {json} Success Response:
 * [
 *  {
 *    "id": "pm25",
 *    "name": "PM2.5",
 *    "description": "Particulate matter less than 2.5 micrometers in diameter",
 *    "preferredUnit": "µg/m³"
 *  },
 *  {
 *    "id": "pm10",
 *    "name": "PM10",
 *    "description": "Particulate matter less than 10 micrometers in diameter",
 *    "preferredUnit": "µg/m³"
 *  },
 *  ...
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
    path: '/v1/parameters',
    config: {
      description: 'The list of parameters that OpenAQ collects.'
    },
    handler: function (request, reply) {
      p = orderBy(p, request.query.order_by || 'name', request.query.sort || 'asc');
      return reply(p);
    }
  }
];

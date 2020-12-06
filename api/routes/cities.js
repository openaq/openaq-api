'use strict';
import { db } from '../services/db';
import { log } from '../services/logger';
import Boom from 'boom';
import config from 'config';
import Joi from 'joi';

const maxRequestLimit = config.get('maxRequestLimit');
const defaultRequestLimit = config.get('defaultRequestLimit');
const orderableColumns = ['country', 'city', 'name', 'count', 'locations'];

/**
 * @api {get} v1/cities GET
 * @apiGroup Cities
 * @apiDescription Provides a simple listing of cities within the platform.
 *
 * @apiParam {string} [country] Limit results by a certain country.
 * @apiParam {string[]} [order_by=country] Order by one or more fields (ex. `order_by=country` or `order_by[]=country&order_by[]=locations`).
 * @apiParam {string[]} [sort=asc] Define sort order for one or more fields (ex. `sort=desc` or `sort[]=asc&sort[]=desc`).
 * @apiParam {number} [limit=100] Change the number of results returned, max is 10000.
 * @apiParam {number} [page=1] Paginate through results.
 *
 * @apiSuccess {string}   name        Name of the city
 * @apiSuccess {string}   city        Name of the city (DEPRECATED: use "name" instead)
 * @apiSuccess {string}   country     Country containing city, in 2 letter ISO code
 * @apiSuccess {number}   count       Number of measurements for this city
 * @apiSuccess {number}   locations   Number of locations in this city
 * @apiSuccessExample {json} Success Response:
 *
 *   [
 *     {
 *       "city": "Amsterdam",
 *       "country": "NL",
 *       "count": 21301,
 *       "locations": 14
 *     },
 *     {
 *       "city": "Badhoevedorp",
 *       "country": "NL",
 *       "count": 2326,
 *       "locations": 1
 *     },
 *     ...
 *   ]
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
    path: '/v1/cities',
    config: {
      description: 'Query cities included in platform.',
      validate: {
        query: {
          country: [Joi.string(), Joi.array().items(Joi.string())],
          limit: Joi.number()
            .default(defaultRequestLimit)
            .max(maxRequestLimit),
          order_by: [
            Joi.string().valid(orderableColumns),
            Joi.array().items(Joi.string().valid(orderableColumns))
          ],
          page: Joi.number(),
          sort: [
            Joi.string().valid('asc', 'desc'),
            Joi.array().items(Joi.string().valid('asc', 'desc'))
          ]
        }
      }
    },

    handler: async function (request, reply) {
      try {
        const { query, page, limit } = request;
        let { country, order_by, sort } = query;
        const offset = (page - 1) * limit;

        // Sort parameters
        let orderBy;
        let sortBy = sort ? [].concat(sort) : [];
        // eslint-disable-next-line
        if (typeof order_by !== 'undefined') {
          // Map orderBy as described in: https://knexjs.org/#Builder-orderBy
          orderBy = [].concat(order_by).map((column, i) => {
            // Handle parameter deprecation (use "name" instead of "city")
            if (column === 'city') column = 'name';

            return {
              column,
              order: sortBy[i] || 'asc'
            };
          });
        } else {
          // Default sort order
          orderBy = ['country', 'name'];
        }

        // Build where clause
        const dbQuery = db('cities').where(builder => {
          if (country) {
            builder.where('country', 'IN', [].concat(country));
          }
        });

        // Query results
        const results = await dbQuery
          .clone()
          .select('country', 'name', 'name as city', 'count', 'locations')
          .offset(offset)
          .orderBy(orderBy)
          .limit(limit);

        // Query count
        request.count = parseInt(
          (await dbQuery.count('country').first()).count
        );

        // Return results
        reply(results);
      } catch (err) {
        // Unexpected error
        log(['error'], err);
        reply(Boom.badImplementation(err.message));
      }
    }
  }
];

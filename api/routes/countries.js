'use strict';
import { db } from '../services/db';
import { log } from '../services/logger';
import config from 'config';
import Boom from 'boom';
import Joi from 'joi';

const maxRequestLimit = config.get('maxRequestLimit');
const defaultRequestLimit = config.get('defaultRequestLimit');
const orderableColumns = ['code', 'name', 'count', 'cities', 'locations'];

// Load country names
let countries = require('../../lib/country-list.json');
countries = countries.reduce((acc, c) => {
  acc[c.Code] = c.Name;
  return acc;
}, {});

/**
 * @api {get} /countries GET
 * @apiGroup Countries
 * @apiDescription Provides a simple listing of countries within the platform.
 *
 * @apiParam {string[]} [order_by=name] Order by one or more fields (ex. `order_by=cities` or `order_by[]=cities&order_by[]=locations`).
 * @apiParam {string[]} [sort=asc] Define sort order for one or more fields (ex. `sort=desc` or `sort[]=asc&sort[]=desc`).
 * @apiParam {number} [limit=100] Change the number of results returned, max is 10000.
 * @apiParam {number} [page=1] Paginate through results.
 *
 * @apiSuccess {string}   code      2 letter ISO code
 * @apiSuccess {string}   name      Country name
 * @apiSuccess {number}   count     Number of measurements for the country
 * @apiSuccess {number}   cities    Number of cities in this country
 * @apiSuccess {number}   locations Number of locations in this country
 * @apiSuccessExample {json} Success Response:
 * [
 *   {
 *     "count": 40638,
 *     "code": "AU",
 *     "name": "Australia"
 *   },
 *   {
 *     "count": 78681,
 *     "code": "BR",
 *     "name": "Brazil"
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
    path: '/v1/countries',
    config: {
      description: 'An aggregation of countries included in platform.',
      validate: {
        query: {
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
        let { order_by, sort } = query;
        const offset = (page - 1) * limit;

        // Sort parameters
        let orderBy;
        let sortBy = sort ? [].concat(sort) : [];
        // eslint-disable-next-line
        if (typeof order_by !== 'undefined') {
          // Map orderBy as described in: https://knexjs.org/#Builder-orderBy
          orderBy = [].concat(order_by).map((column, i) => {
            return {
              column,
              order: sortBy[i] || 'asc'
            };
          });
        } else {
          // Default sort order
          orderBy = ['code', 'count'];
        }

        // Base query
        const dbQuery = db.from(function () {
          this.from('cities')
            .select('country as code')
            .sum('count as count')
            .sum('locations as locations')
            .count('name as cities')
            .groupBy('country')
            .as('countries');
        });

        // Query results
        const results = await dbQuery
          .clone()
          .select('*')
          .offset(offset)
          .orderBy(orderBy)
          .limit(limit)
          .map(r => {
            // Add country name
            r.name = countries[r.code];
            r.count = parseInt(r.count);
            r.locations = parseInt(r.locations);
            r.cities = parseInt(r.cities);
            return r;
          });

        // Query count
        request.count = parseInt(
          (await dbQuery.count('count').first()).count
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

'use strict';

import config from 'config';
import _ from 'lodash';
import { lonLatRegex } from '../../lib/utils';
import Boom from 'boom';
import Joi from 'joi';
import m from '../controllers/averages.js';

const maxRequestLimit = config.get('maxRequestLimit');
const defaultRequestLimit = config.get('defaultRequestLimit');

// TODO: ADD IN AVERAGING METHODOLOGY BELOW
/**
 * @api {get} /averages GET
 * @apiGroup Averages
 * @apiDescription (BETA) Provides averages across specified spatial and temporal resolutions. Give feedback at: github.com/openaq/openaq-averaging
 *
 * @apiParam {string} [country] Limit results by a certain country.
 * @apiParam {string} [city] Limit results by a certain city.
 * @apiParam {string} [location] Limit results by a certain location.
 * @apiParam {string=pm25, pm10, so2, no2, o3, co, bc} [parameter] Note: Currently only works for pm25. Limit to certain one or more parameters (ex. `parameter=pm25` or `parameter[]=co&parameter[]=pm25`)
 * @apiParam {boolean=true, false} [has_geo] Filter out items that have or do not have geographic information.
 * @apiParam {string} [coordinates] Center point (`lat, lon`) used to get calculations within a certain area. (ex. `coordinates=40.23,34.17`)
 * @apiParam {number} [radius=2500] Radius (in meters) used to get calculations within a certain area, must be used with `coordinates`.
 * @apiParam {string} [date_from] Show results after a certain date (in utc). (ex. `2015-12-20`, or `2015-12-20T09:00:00`)
 * @apiParam {string} [date_to] Show results before a certain date (in utc). (ex. `2015-12-20`, or `2015-12-20T09:00:00`)
 * @apiParam {string[]} [order_by=date] Order by one or more fields (ex. `order_by=date` or `order_by[]=value&order_by[]=parameter`).
 * @apiParam {string[]} [sort=asc] Define sort order for one or more fields (ex. `sort=desc` or `sort[]=asc&sort[]=desc`).
 * @apiParam {number} [limit=100] Change the number of results returned, max is 10000.
 * @apiParam {number} [page=1] Paginate through results. Max is set at 100.
 *
 * @apiSuccess {string}   country         Country for calculated average in 2 letter ISO code `default`
 * @apiSuccess {string}   city            City for calculated average
 * @apiSuccess {string}   location        Location for calculated average
 * @apiSuccess {object}   coordinates     Latitude and longitude for calculated average
 * @apiSuccess {string}   parameter       Parameter for calculated average for `default`
 * @apiSuccess {object}   date            Date and time for calculated average in UTC `default`
 * @apiSuccess {number}   average         Calculated average `default`
 * @apiSuccess {number}   measurement_count   Number of measurements used to calculate average `default`

 * @apiSuccessExample {json} Success Response:
 *      HTTP/1.1 200 OK
 *  {
 *    "country": "AE",
 *    "city": "Abu Dhabi",
 *     "location": "US Diplomatic Post: Abu Dhabi",
 *     "coordinates": {
 *       "longitude": 54.43375,
 *       "latitude": 24.4244
 *     },
 *     "parameter": "pm25",
 *     "date": "2017-12-26",
 *     "average": 41.2857,
 *     "measurement_count": null
 *   }
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
    path: '/v1/beta-averages',
    config: {
      description: 'BETA - Retrieve measurement averages for specified spatial and temporal resolutions.',
      validate: {
        query: {
          city: [Joi.string(), Joi.array().items(Joi.string())],
          coordinates: Joi.string()
                        .regex(lonLatRegex)
                        .error(() => 'invalid coordinates pair'),
          country: [Joi.string(), Joi.array().items(Joi.string())],
                    // has_geo: Joi.boolean(),
          limit: Joi.number()
                        .default(defaultRequestLimit)
                        .max(maxRequestLimit),
          location: [Joi.string(), Joi.array().items(Joi.string())],
                    // name: [Joi.string(), Joi.array().items(Joi.string())],
          order_by: [Joi.string(), Joi.array().items(Joi.string())],
          temporal: [Joi.string()], // day, month, year
          spatial: [Joi.string()], // location, city, country
          date_from: Joi.date().iso(),
          date_to: Joi.date().iso(),
          page: Joi.number(),
                    // parameter: [Joi.string(), Joi.array().items(Joi.string())],
                    // radius: Joi.number(),
          sort: [
            Joi.string().valid('asc', 'desc'),
            Joi.array().items(Joi.string().valid('asc', 'desc'))
          ]
                    // format: Joi.string().valid('json', 'csv'),
                    // include_fields: Joi.string()
        }
      }
    },
    handler: async function (request, reply) {
      try {
        var params = {};

                // For GET
        if (request.query) {
          params = request.query;
        }

                // Set max limit based on env var or default to 10000
        request.limit = Math.min(
                    request.limit,
                    process.env.REQUEST_LIMIT || 10000
                );

                // 6/20/2019 We're seeing major database issues related to someone trying
                // to query the API for all the data in the system and making large page requests.
        if (request.page > (process.env.REQUEST_PAGE || 100)) {
          return reply(Boom.badRequest('page limit is set too high'));
        }

                // Set default spatial and temporal to location and day
        if (params.spatial === '') { params.spatial = 'location'; }
        if (params.temporal === '') { params.temporal = 'day'; }

                // Check if this is supposed to be formatted as csv
        var formatForCSV = false;
        if (params.format === 'csv') {
          formatForCSV = true;

                    // Set a different max limit for CSVs to get a lot of data, but not
                    // all of it, because that's just crazy. Setting to 65,536 since this
                    // is the Excel limit from a while back and is as good as anything.

                    // This gets a bit weird since we want to honor any orig set limit,
                    // regardless of what was just set above
          let limit = request.url.query.limit || 65536;
          request.limit = Math.min(limit, 65536);

                    // Force to include attribution, handle case where it may have already
                    // been present.
          if (params.include_fields === undefined) {
            params.include_fields = 'attribution';
          } else {
            if (params.include_fields.indexOf('attribution') === -1) {
              params.include_fields += ',attribution';
            }
          }
        }
        params = _.omit(params, 'format');

                // Run query
        let { records, count } = await m.query(
                    params,
                    request.page,
                    request.limit
                );

        if (formatForCSV) { // IGNORE FOR NOW
        //   console.log('csv option');
                    // var columns = [
                    //     'location',
                    //     'city',
                    //     'country',
                    //     'utc',
                    //     'local',
                    //     'parameter',
                    //     'value',
                    //     'unit',
                    //     'latitude',
                    //     'longitude'
                    // ];
                    // var options = {
                    //     header: true,
                    //     columns: columns.concat(params.include_fields.split(','))
                    // };
                    // records = records.map(function (r) {
                    //     r.utc = r.date.utc;
                    //     r.local = r.date.local;
                    //     if (r.coordinates) {
                    //         r.latitude = r.coordinates.latitude;
                    //         r.longitude = r.coordinates.longitude;
                    //     }
                    //     r = _.omit(r, ['date', 'coordinates']);
                    //     return r;
                    // });

                    // csv(records, options, function (err, data) {
                    //     if (err) {
                    //         log(['error'], err);
                    //         return reply(Boom.badImplementation(err));
                    //     }

                    //     // And force the csv to be downloaded in browser
                    //     var response = reply(data);
                    //     response.header('Content-type', 'text/csv');
                    //     response.header(
                    //         'Content-disposition',
                    //         'attachment;filename=openaq.csv'
                    //     );
                    // });
        } else {
          request.count = count;
          return reply(records);
        }
      } catch (err) {
        return reply(Boom.badImplementation(err));
      }
    }
  }
];

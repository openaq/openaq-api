'use strict';

import config from 'config';
import _ from 'lodash';
import { log } from '../services/logger';
import { lonLatRegex } from '../../lib/utils';
import Boom from 'boom';
import csv from 'csv-stringify';
import Joi from '@hapi/joi';
import m from '../controllers/measurements.js';

const maxRequestLimit = config.get('maxRequestLimit');
const defaultRequestLimit = config.get('defaultRequestLimit');

/**
 * @api {get} /measurements GET
 * @apiGroup Measurements
 * @apiDescription Provides data about individual measurements
 *
 * @apiParam {string} [country] Limit results by a certain country.
 * @apiParam {string} [city] Limit results by a certain city.
 * @apiParam {string} [location] Limit results by a certain location.
 * @apiParam {string=pm25, pm10, so2, no2, o3, co, bc} [parameter] Limit to certain one or more parameters (ex. `parameter=pm25` or `parameter[]=co&parameter[]=pm25`)
 * @apiParam {boolean=true, false} [has_geo] Filter out items that have or do not have geographic information.
 * @apiParam {string} [coordinates] Center point (`lat, lon`) used to get measurements within a certain area. (ex. `coordinates=40.23,34.17`)
 * @apiParam {number} [radius=2500] Radius (in meters) used to get measurements within a certain area, must be used with `coordinates`.
 * @apiParam {number} [value_from] Show results above value threshold, useful in combination with `parameter`.
 * @apiParam {number} [value_to] Show results below value threshold, useful in combination with `parameter`.
 * @apiParam {string} [date_from] Show results after a certain date. This acts on the `utc` timestamp of each measurement. (ex. `2015-12-20`, or `2015-12-20T09:00:00`)
 * @apiParam {string} [date_to] Show results before a certain date. This acts on the `utc` timestamp of each measurement. (ex. `2015-12-20`, or `2015-12-20T09:00:00`)
 * @apiParam {string[]} [order_by=date] Order by one or more fields (ex. `order_by=date` or `order_by[]=value&order_by[]=parameter`).
 * @apiParam {string[]} [sort=asc] Define sort order for one or more fields (ex. `sort=desc` or `sort[]=asc&sort[]=desc`).
 * @apiParam {array=attribution, averagingPeriod, sourceName}  [include_fields] Include extra fields in the output in addition to default values.
 * @apiParam {number} [limit=100] Change the number of results returned, max is 10000.
 * @apiParam {number} [page=1] Paginate through results. Max is set at 100.
 * @apiParam {string=csv, json} [format=json] Format for data return. Note that `csv` will return a max of 65,536 results when no limit is set.
 *
 * @apiSuccess {object}   date            Date and time of measurement in both local and UTC `default`
 * @apiSuccess {string}   parameter       Property being measured `default`
 * @apiSuccess {number}   value           Value of measurement `default`
 * @apiSuccess {string}   unit            Unit of measurement `default`
 * @apiSuccess {string}   location        Location description for measurement `default`
 * @apiSuccess {string}   country         Country containing measurement in 2 letter ISO code `default`
 * @apiSuccess {string}   city            City containing measurement `default`
 * @apiSuccess {object}   coordinates     Latitude and longitude measurement was taken at `default`
 * @apiSuccess {string}   sourceName      Name of source matching to sources table for reference
 * @apiSuccessExample {json} Success Response:
 *      HTTP/1.1 200 OK
 *      {
 *       "parameter": "Ammonia",
 *       "date": {
 *           "utc": "2015-07-16T20:30:00.000Z",
 *           "local": "2015-07-16T18:30:00.000-02:00"
 *       },
 *       "value": "72.9",
 *       "unit": "µg/m3",
 *       "location": "Anand Vihar",
 *       "country": "IN",
 *       "city": "Delhi",
 *       "sourceName": "Anand Vihar",
 *       "averagingPeriod": {
 *          "value": 1,
 *          "unit": "hours"
 *       },
 *       "coordinates": {
 *          "latitude": 43.34,
 *          "longitude": 23.04
 *       },
 *       "attribution": [
 *         {
 *           "name" : "SINCA",
 *           "url" : "http://sinca.mma.gob.cl/"
 *         },
 *         {
 *           "name" : "Ministerio del Medio Ambiente"
 *         }
 *       ]
 *     }
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
    path: '/v1/measurements',
    config: {
      description: 'Retrieve data for individual measurements.',
      validate: {
        query: {
          city: [Joi.string(), Joi.array().items(Joi.string())],
          coordinates: Joi.string()
            .regex(lonLatRegex)
            .error(new Error('invalid coordinates pair')),
          country: [Joi.string(), Joi.array().items(Joi.string())],
          has_geo: Joi.boolean(),
          limit: Joi.number()
            .default(defaultRequestLimit)
            .max(maxRequestLimit),
          location: [Joi.string(), Joi.array().items(Joi.string())],
          name: [Joi.string(), Joi.array().items(Joi.string())],
          order_by: [Joi.string(), Joi.array().items(Joi.string())],
          value_from: Joi.number(),
          value_to: Joi.number(),
          date_from: Joi.date().iso(),
          date_to: Joi.date().iso(),
          page: Joi.number(),
          parameter: [Joi.string(), Joi.array().items(Joi.string())],
          radius: Joi.number(),
          sort: [
            Joi.string().valid('asc', 'desc'),
            Joi.array().items(Joi.string().valid('asc', 'desc'))
          ],
          format: Joi.string().valid('json', 'csv'),
          include_fields: Joi.string()
        }
      }
    },
    handler: async function (request, h) {
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
          return Boom.badRequest('page limit is set too high');
        }

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

        if (formatForCSV) {
          var columns = [
            'location',
            'city',
            'country',
            'utc',
            'local',
            'parameter',
            'value',
            'unit',
            'latitude',
            'longitude'
          ];
          var options = {
            header: true,
            columns: columns.concat(params.include_fields.split(','))
          };
          records = records.map(function (r) {
            r.utc = r.date.utc;
            r.local = r.date.local;
            if (r.coordinates) {
              r.latitude = r.coordinates.latitude;
              r.longitude = r.coordinates.longitude;
            }
            r = _.omit(r, ['date', 'coordinates']);
            return r;
          });

          return new Promise((resolve, reject) => {
            csv(records, options, function (err, data) {
              if (err) {
                log(['error'], err);
                return reject(Boom.badImplementation(err));
              }

              // And force the csv to be downloaded in browser
              var response = h.response(data);
              response.header('Content-type', 'text/csv');
              response.header(
                'Content-disposition',
                'attachment;filename=openaq.csv'
              );
              return resolve(response);
            });
          });
        } else {
          request.count = count;
          return records;
        }
      } catch (err) {
        return Boom.badImplementation(err);
      }
    }
  }
];

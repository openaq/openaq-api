'use strict';

var Boom = require('boom');
var m = require('../controllers/measurements.js');
var _ = require('lodash');
var csv = require('csv-stringify');
import { log } from '../services/logger';

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
 * @apiParam {string} [sort=desc] The sort order, asc or desc. Must be used with `order_by`.
 * @apiParam {string} [order_by=date] Field to sort by. Must be used with `sort`.
 * @apiParam {array=attribution, averagingPeriod, sourceName}  [include_fields] Include extra fields in the output in addition to default values.
 * @apiParam {number} [limit=100] Change the number of results returned, max is 1000.
 * @apiParam {number} [page=1] Paginate through results.
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
      description: 'Retrieve data for individual measurements.'
    },
    handler: function (request, reply) {
      var params = {};

      // For GET
      if (request.query) {
        params = request.query;
      }

      // Set max limit based on env var or default to 10000
      request.limit = Math.min(request.limit, process.env.REQUEST_LIMIT || 10000);

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

      // Handle it
      m.query(params, request.page, request.limit, function (err, records, count) {
        if (err) {
          return reply(Boom.badImplementation(err));
        }

        if (formatForCSV) {
          var columns = ['location', 'city', 'country', 'utc', 'local', 'parameter', 'value', 'unit'];
          var options = {
            header: true,
            columns: columns.concat(params.include_fields.split(','))
          };

          records = records.map(function (r) {
            r.utc = r.date.utc;
            r.local = r.date.local;
            r = _.omit(r, 'date');
            return r;
          });

          csv(records, options, function (err, data) {
            if (err) {
              log(['error'], err);
              return reply(Boom.badImplementation(err));
            }

            // And force the csv to be downloaded in browser
            var response = reply(data);
            response.header('Content-type', 'text/csv');
            response.header('Content-disposition', 'attachment;filename=openaq.csv');
          });
        } else {
          request.count = count;
          return reply(records);
        }
      });
    }
  }
];

'use strict';

var Boom = require('boom');
var m = require('../controllers/measurements.js');
var _ = require('lodash');
var csv = require('csv-stringify');

/**
 * @api {get} /measurements GET
 * @apiGroup Measurements
 * @apiDescription Providing data about individual measurements
 *
 * @apiParam {string} [country] Limit results by a certain country.
 * @apiParam {string} [city] Limit results by a certain city.
 * @apiParam {string} [location] Limit results by a certain location.
 * @apiParam {string} [parameter] Limit to only a certain parameter (valid values are pm25, pm10, so2, no2, o3, co and bc).
 * @apiParam {boolean} [has_geo] Filter out items that have or do not have geographic information.
 * @apiParam {number} [value_from] Show results above value threshold, useful in combination with `parameter`.
 * @apiParam {number} [value_to] Show results below value threshold, useful in combination with `parameter`.
 * @apiParam {string} [date_from] Show results after a certain date. (ex. `2015-12-20`)
 * @apiParam {string} [date_to] Show results before a certain date. (ex. `2015-12-20`)
 * @apiParam {string} [sort=desc] The sort order, asc or desc. Must be used with `order_by`.
 * @apiParam {string} [order_by=date] Field to sort by. Must be used with `sort`.
 * @apiParam {array}  [include_fields=location,parameter,date,value,unit,coordinates,country,city] Include extra fields in the output in addition to default values.
 * @apiParam {number} [limit=100] Change the number of results returned, max is 100.
 * @apiParam {number} [page=1] Paginate through results.
 * @apiParam {number} [skip] Number of records to skip.
 * @apiParam {string} [format=json] Format for data return, can be `csv` or `json`.
 *
 * @apiSuccess {string}   _id             Unique ID `default`
 * @apiSuccess {date}     date            Date and time of measurement (UTC) `default`
 * @apiSuccess {string}   parameter       Property being measured `default`
 * @apiSuccess {number}   value           Value of measurement `default`
 * @apiSuccess {string}   unit            Unit of measurement `default`
 * @apiSuccess {string}   location        Location description for measurement `default`
 * @apiSuccess {string}   country         2 digit country code containing measurement `default`
 * @apiSuccess {string}   city            City containing measurement `default`
 * @apiSuccess {object}   coordinates     Latitude and longitude measurement was taken at `default`
 * @apiSuccess {string}   sourceName      Name of source matching to sources table for reference
 * @apiSuccess {array}    attribution     Attribution information for the measurement (name and url), in priority order.
 * @apiSuccess {object}   averagingPeriod Period over which measurement is averaged.
 * @apiSuccessExample {json} Success Response:
 *      HTTP/1.1 200 OK
 *      {
 *       "_id": "55a823fc3fe18309498d6ce2",
 *       "parameter": "Ammonia",
 *       "date": "2015-07-16T20:30:00.000Z",
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
    handler: function (request, reply) {
      var params = {};

      // For GET
      if (request.query) {
        params = request.query;
      }

      // Set max limit to 100
      request.limit = Math.min(request.limit, 100);

      // Check if this is supposed to be formatted as csv
      var formatForCSV = false;
      if (params.format === 'csv') {
        formatForCSV = true;

        // Remove limit for CSVs, should probably set max size at some point
        request.limit = undefined;
      }
      params = _.omit(params, 'format');

      // Handle it
      m.query(params, request.page, request.limit, function (err, records, count) {
        if (err) {
          console.error(err);
          return reply(Boom.badImplementation(err));
        }

        if (formatForCSV) {
          var options = {
            header: true,
            columns: ['location', 'city', 'country', 'utc', 'local', 'parameter', 'value', 'unit']
          };

          records = records.map(function (r) {
            r.utc = r.date.utc.toISOString();
            r.local = r.date.local;
            r = _.omit(r, 'date');
            return r;
          });

          csv(records, options, function (err, data) {
            if (err) {
              console.error(err);
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

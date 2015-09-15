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
 * @apiParam {string} [location] Limit results by a certain location.
 * @apiParam {string} [parameter] Limit to only a certain parameter (valid values are pm25, pm10, so2, no2, o3, co and bc).
 * @apiParam {boolean} [has_geo=true] Only return items with geographic coordinates, this option can only be `true`.
 * @apiParam {number} [value_from] Show results above value threshold, useful in combination with `parameter`.
 * @apiParam {number} [value_to] Show results below value threshold, useful in combination with `parameter`.
 * @apiParam {string} [date_from] Show results after a certain date.
 * @apiParam {string} [date_to] Show results before a certain date.
 * @apiParam {string} [sort=desc] The sort order, asc or desc. Must be used with `order_by`.
 * @apiParam {string} [order_by=date] Field to sort by. Must be used with `sort`.
 * @apiParam {number} [limit=100] Change the number of results returned, max is 100.
 * @apiParam {number} [page=1] Paginate through results.
 * @apiParam {number} [skip] Number of records to skip.
 * @apiParam {string} [format=json] Format for data return, can be `csv` or `json`.
 *
 * @apiSuccess {string}   _id            Unique ID
 * @apiSuccess {date}   date          Date and time of measurement (UTC)
 * @apiSuccess {string}   parameter     Property being measured
 * @apiSuccess {number}   value         Value of measurement
 * @apiSuccess {string}   unit           Unit of measurement
 * @apiSuccess {string}   location      Location description for measurement
 * @apiSuccess {string}   country       2 digit country code containing measurement
 * @apiSuccess {string}   city       City containing measurement
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
 *       "city": "Delhi"
 *      }
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
            columns: ['location', 'city', 'country', 'date', 'parameter', 'value', 'unit']
          };

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

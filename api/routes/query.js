'use strict';

const utils = require('../../lib/utils');
const { db } = require('../services/db');
const AWS = require('aws-sdk');
const athena = new AWS.Athena({region: 'us-east-1'});
var Boom = require('boom');
import { log } from '../services/logger';

// TODO(aimee): store these in a config
const outputBucket = 'aws-athena-query-results-openaq';
const athenaConfig = {
  table: '"openaq_realtime_gzipped"."fetches_realtime_gzipped"',
  outputLocation: `s3://${outputBucket}`,
  outputUrl: `https://${outputBucket}.s3.amazonaws.com`
};

/**
 * @api {get} /query GET
 * @apiGroup Query
 * @apiDescription Query measurements stored in S3.
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
 *
 * @apiSuccess {string}   downloadUrl  Location of results when using HTTPS protocol
 * @apiSuccess {string}   s3Uri        Location of results when using S3 protocol
 * @apiSuccessExample {json} Success Response:
 *      HTTP/1.1 200 OK
 *      {
 *        "downloadUrl": "https://<bucket>.s3.amazonaws.com/<uuid>.csv",
 *        "s3Uri": "s3://<bucket>/<uuid>.csv"
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
    path: '/v1/query',
    config: {
      description: 'Query all results using Athena.'
    },
    handler: function (request, reply) {
      let initQuery = db.select('*').from(athenaConfig.table);

      let { payload, operators, betweens, nulls, notNulls, geo } = utils.queryFromParameters(request.query);
      let athenaQuery = utils.buildSQLQuery(initQuery, payload, operators, betweens, nulls, notNulls, geo);
      athenaQuery = athenaQuery.toString().replace(/"/gi, '');

      const athenaParams = {
        QueryString: athenaQuery,
        ResultConfiguration: {
          OutputLocation: athenaConfig.outputLocation
        }
      };

      athena.startQueryExecution(athenaParams, function (err, data) {
        if (err) {
          log(['error'], err);
          return reply(Boom.badImplementation(err));
        } else {
          return reply({
            downloadUrl: `${athenaConfig.outputUrl}/${data.QueryExecutionId}.csv`,
            s3Uri: `${athenaConfig.outputLocation}/${data.QueryExecutionId}.csv`
          });
        }
      });
    }
  }
];

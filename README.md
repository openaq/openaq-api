# OpenAQ Platform API
[![Build Status](https://travis-ci.org/openaq/openaq-api.svg?branch=master)](https://travis-ci.org/openaq/openaq-api)

## Overview
This is the main API for the [OpenAQ](https://openaq.org) project.

Starting with `index.js`, there is a web-accessible API that provides endpoints to query the air quality measurements. Documentation can be found at [https://docs.openaq.org/](https://docs.openaq.org/).

[openaq-fetch](https://github.com/openaq/openaq-fetch) takes care of fetching new data and inserting into the database. Data format is explained in [openaq-data-format](https://github.com/openaq/openaq-data-format).

## Installing & Running
To run the API locally, you will need both [Node.js](https://nodejs.org) and [PostgreSQL](http://www.postgresql.org/) installed.

Install necessary Node.js packages by running

`npm install`

Make sure you have a PostgreSQL database available (with PostGIS extension) and have the DB settings in `knexfile.js`.

Now you can get started with:

`npm start`

For production deployment, you will need to have certain environment variables set as in the table below (for production deployments, these are stored in an S3 bucket).

| Name | Description | Default |
|---|---|---|
| API_URL | Base API URL after deployment | http://<hostname>:3004 |
| NEW_RELIC_LICENSE_KEY | New Relic API key for system monitoring | not set |
| WEBHOOK_KEY | Secret key to interact with openaq-api | '123' |
| USE_REDIS | Use Redis for caching? | not set (so not used) |
w| USE_ATHENA | Use AWS Athena for aggregations? | not set (so not used) |
| REDIS_URL | Redis instance URL | redis://localhost:6379 |
| KEEN_PROJECT_ID | Keen project ID for analytics. | not set |
| KEEN_WRITE_KEY | Keen write key for analytics. | not set |
| DO_NOT_UPDATE_CACHE | Ignore updating cache, but still use older cached results. | not set |
| REQUEST_LIMIT | Max number of items that can be requested at one time. | 10000 |
| UPLOADS_ENCRYPTION_KEY | Key used to encrypt upload token for /upload in database. | 'not_secure' |
| S3_UPLOAD_BUCKET | The bucket to upload external files to for /upload. | not set |

### AWS Athena for aggregations

If `USE_ATHENA` is set, the API will use AWS Athena instead of creating Postgres aggregations tables for queries. The following variables should be set as well:
- `ATHENA_ACCESS_KEY_ID`: An AWS Access Key that has permissions to create Athena Queries and store them in S3.
- `ATHENA_SECRET_ACCESS_KEY`: The corresponding secret.
- `ATHENA_OUTPUT_BUCKET`: The S3 location (in the form of `s3://bucket/folder`) where the results of the Athena queries should be stored before caching them.

The Athena table is `fetches_realtime` that represents the fetches from `openaq-data` and has the following schema:

```sql
CREATE EXTERNAL TABLE fetches.fetches_realtime (
  date struct<utc:string,local:string>,
  parameter string,
  location string,
  value float,
  unit string,
  city string,
  attribution array<struct<name:string,url:string>>,
  averagingPeriod struct<unit:string,value:float>,
  coordinates struct<latitude:float,longitude:float>,
  country string,
  sourceName string,
  sourceType string,
  mobile string
 )
 ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
 LOCATION 's3://EXAMPLE_BUCKET'
```

## Uploads & Generating S3 presigned URLs
Via an undocumented `/upload` endpoint, there is the ability to generate presigned S3 PUT URLs so that external clients can authenticate using tokens stored in the database and upload data to be ingested by `openaq-fetch`. There is a small utility file called `encrypt.js` that you can use like `UPLOADS_ENCRYPTION_KEY=foo node index.js your_token_here` to generate encrytped tokens to be manually stored in database.

## Tests
To confirm that everything is working as expected, you can run the tests with

`npm test`

## Dockerfile
There is a Dockerfile included that will turn the project into a Docker container. The container can be found [here](https://hub.docker.com/r/flasher/openaq-api/) and is currently mostly used for deployment purposes for [AWS ECS](https://aws.amazon.com/ecs/). If someone wanted to make it better for local development, that'd be a great PR!

## Contributing
There are a lot of ways to contribute to this project, more details can be found in the [contributing guide](CONTRIBUTING.md).

## Projects using the API
- openaq-browser [site](http://dolugen.github.io/openaq-browser) | [code](https://github.com/dolugen/openaq-browser) - A simple browser to provide a graphical interface to the data.
- openaq [code](https://github.com/nickolasclarke/openaq) - An isomorphic Javascript wrapper for the API
- py-openaq [code](https://github.com/dhhagan/py-openaq) - A Python wrapper for the API
- ropenaq [code](https://github.com/ropenscilabs/ropenaq) - An R package for the API

For more projects that are using OpenAQ API, checkout the [OpenAQ.org Community](https://openaq.org/#/community) page.

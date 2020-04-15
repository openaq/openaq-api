'use strict';
import Hapi from '@hapi/hapi';
import Boom from 'boom';
import GoodWinston from 'good-winston';
import winston from 'winston';
require('winston-papertrail').Papertrail;
import os from 'os';
import jwksRsa from 'jwks-rsa';
import hapiAuthJwt2 from 'hapi-auth-jwt2';
import config from 'config';

import { startAthenaSyncTask } from './athena-sync';
import { getLastUpdated } from './redis';

const athenaConfig = config.get('athena');

var Server = function (port) {
  this.port = port;
  this.hapi = new Hapi.Server({
    port: port,
    host: 'localhost',
    router: {
      stripTrailingSlash: true
    },
    routes: {
      cors: { credentials: true },
      validate: {
        failAction: async (request, h, err) => {
          if (process.env.NODE_ENV === 'default') {
            // In prod, log a limited error message and throw the default Bad Request error.
            throw Boom.badRequest('Invalid request payload input');
          } else {
            // During development, log and respond with the full error.
            throw err;
          }
        }
      }
    },
    debug: process.env.API_DEBUG ? {
      log: [ 'error' ],
      request: [ 'error', 'received', 'response' ]
    } : false
  });
};

Server.prototype.start = async function (cb) {
  var self = this;
  self.hapi.app.url = process.env.API_URL || self.hapi.info.uri;

  // Register auth service
  const { strategy, issuer, audience } = config.get('auth');
  if (strategy === 'jwt') {
    try {
      await self.hapi.register({ plugin: hapiAuthJwt2 });
    } catch (err) {
      if (err) return cb(err);

      self.hapi.auth.strategy('jwt', 'jwt', false, {
        complete: true,
        key: jwksRsa.hapiJwt2Key({
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 5,
          jwksUri: `${issuer}.well-known/jwks.json`
        }),
        verifyOptions: {
          audience: audience,
          issuer: issuer,
          algorithms: ['RS256']
        },
        validateFunc: (decoded, request, callback) => {
          if (decoded && decoded.sub) {
            // Check if the user is active.
            const isActive = decoded['http://openaq.org/user_metadata'].active;
            return callback(null, isActive);
          }
          return callback(null, false);
        }
      });
    }
  }

  // Register hapi-router
  await self.hapi.register({
    plugin: require('hapi-router'),
    options: {
      routes: './api/routes/*.js'
    }
  });

  // Register hapi-response-meta
  await self.hapi.register({
    plugin: require('hapi-response-meta'),
    options: {
      content: {
        name: 'openaq-api',
        license: 'CC BY 4.0',
        website: process.env.RESPONSE_HEADER_SERVER || 'https://docs.openaq.org/'
      },
      excludeFormats: ['csv']
    }
  });

  // Register hapi-paginate
  await self.hapi.register({
    plugin: require('hapi-paginate'),
    options: {
      limit: 100,
      excludeFormats: ['csv'],
      routes: [
        '/v1/measurements',
        '/v1/locations',
        '/v1/latest',
        '/v1/cities',
        '/v1/countries',
        '/v1/fetches',
        '/v1/sources'
      ]
    }
  });

  await self.hapi.register({
    plugin: require('hapi-qs')
  });

  // Setup loggin
  var logger = new winston.Logger({
    level: 'info',
    transports: [
      new winston.transports.Console({
        colorize: true,
        timestamp: function () {
          return new Date().toString();
        }
      })
    ]
  });
  // Add Papertrail logger if we have credentials
  if (process.env.PAPERTRAIL_URL) {
    logger.add(winston.transports.Papertrail, {
      host: process.env.PAPERTRAIL_URL,
      port: process.env.PAPERTRAIL_PORT,
      hostname: process.env.PAPERTRAIL_HOSTNAME,
      colorize: true,
      program: os.hostname()
    });
  }
  var options = {
    reporters: {
      myReporter: [
        new GoodWinston({ winston: logger })
      ]
    }
  };

  await self.hapi.register({
    plugin: require('good'),
    options: options
  });

  // Handle dynamic CloudFront caching
  var CloudFrontPlugin = {
    name: 'CloudFrontPlugin',
    version: '0.0.2',
    register: function (server, options) {
      server.ext('onPreHandler', function (request, h) {
        // Don't catch webhooks or this whole thing will never update
        if (request.route.path.indexOf('webhooks') !== -1) {
          return h.continue;
        }

        // Return 304 if If-Modified-Since is newer than our last updated time
        try {
          let ifModifiedSince = request.headers['if-modified-since'];
          if (!ifModifiedSince) {
            return h.continue;
          }

          if (!getLastUpdated() || new Date(ifModifiedSince) < new Date(getLastUpdated())) {
            return h.continue;
          } else {
            const response = h.response('use cache');
            response.statusCode = 304;
            return response;
          }
        } catch (e) {
          // If anything went wrong, just continue like normal
          return h.continue;
        }
      });
    }
  };
  await self.hapi.register(CloudFrontPlugin);

  // // Handle dynamic CloudFront caching
  var LastModifiedPlugin = {
    name: 'LastModifiedPlugin',
    version: '0.0.2',
    register: function (server, options) {
      server.ext('onPreResponse', function (request, h) {
        // Add the LastModified header
        if (getLastUpdated && getLastUpdated()) {
          try {
            request.response.header('Last-Modified', new Date(getLastUpdated()).toUTCString());
          } catch (e) {
            // Don't need to do anything here, just keep from crashing
          }
        }

        return h.continue;
      });
    }
  };
  await self.hapi.register(LastModifiedPlugin);

  await self.hapi.start();
  self.hapi.log(['info'], 'Server running at:' + self.hapi.info.uri);
  if (cb && typeof cb === 'function') {
    cb();
  }

  // Start Athena auto sync, if enabled
  if (athenaConfig.syncEnabled === 'true') {
    // Wait 5 minutes to start Athena auto sync.
    // This is a precaution to avoid generate lots of Athena requests
    // in case the server is restarting frequently due to
    // some error.
    setTimeout(() => {
      // Schedule auto sync task
      setInterval(startAthenaSyncTask, athenaConfig.syncInterval);
    }, 5000);
  }
};

module.exports = Server;

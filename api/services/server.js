'use strict';

var Hapi = require('hapi');
var GoodWinston = require('good-winston');
var winston = require('winston');
require('winston-papertrail').Papertrail;
var os = require('os');
import { getLastUpdated } from './redis';

var Server = function (port) {
  this.port = port;
  this.hapi = new Hapi.Server({
    connections: {
      routes: {
        cors: { credentials: true }
      },
      router: {
        stripTrailingSlash: true
      }
    },
    debug: process.env.API_DEBUG ? {
      log: [ 'error' ],
      request: [ 'error', 'received', 'response' ]
    } : false
  });
};

Server.prototype.start = function (cb) {
  var self = this;
  self.hapi.connection({ port: this.port });
  self.hapi.app.url = process.env.API_URL || self.hapi.info.uri;

  // Register hapi-router
  self.hapi.register({
    register: require('hapi-router'),
    options: {
      routes: './api/routes/*.js'
    }
  }, function (err) {
    if (err) throw err;
  });

  // Register hapi-response-meta
  self.hapi.register({
    register: require('hapi-response-meta'),
    options: {
      content: {
        name: 'openaq-api',
        license: 'CC BY 4.0',
        website: process.env.RESPONSE_HEADER_SERVER || 'https://docs.openaq.org/'
      },
      excludeFormats: ['csv']
    }
  }, function (err) {
    if (err) throw err;
  });

  // Register hapi-paginate
  self.hapi.register({
    register: require('hapi-paginate'),
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
  }, function (err) {
    if (err) throw err;
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
    reporters: [
      new GoodWinston({
        request: '*',
        response: '*',
        log: '*',
        error: '*'
      }, logger)
    ]
  };

  self.hapi.register({
    register: require('good'),
    options: options
  }, function (err) {
    if (err) throw err;
  });

  // Handle dynamic CloudFront caching
  var CloudFrontPlugin = {
    register: function (server, options, next) {
      server.ext('onPreHandler', function (request, reply) {
        // Don't catch webhooks or this whole thing will never update
        if (request.route.path.indexOf('webhooks') !== -1) {
          return reply.continue();
        }

        // Return 304 if If-Modified-Since is newer than our last updated time
        try {
          let ifModifiedSince = request.headers['if-modified-since'];
          if (!ifModifiedSince) {
            return reply.continue();
          }

          if (!getLastUpdated() || new Date(ifModifiedSince) < new Date(getLastUpdated())) {
            return reply.continue();
          } else {
            const response = reply('use cache');
            response.statusCode = 304;
            return response;
          }
        } catch (e) {
          // If anything went wrong, just continue like normal
          return reply.continue();
        }
      });

      next();
    }
  };
  CloudFrontPlugin.register.attributes = {
    name: 'CloudFrontPlugin',
    version: '0.0.1'
  };
  self.hapi.register(CloudFrontPlugin, function (err) {
    if (err) throw err;
  });

  // Handle dynamic CloudFront caching
  var LastModifiedPlugin = {
    register: function (server, options, next) {
      server.ext('onPreResponse', function (request, reply) {
        // Add the LastModified header
        if (getLastUpdated && getLastUpdated()) {
          try {
            request.response.header('Last-Modified', new Date(getLastUpdated()).toUTCString());
          } catch (e) {
            // Don't need to do anything here, just keep from crashing
          }
        }

        reply.continue();
      });

      next();
    }
  };
  LastModifiedPlugin.register.attributes = {
    name: 'LastModifiedPlugin',
    version: '0.0.1'
  };
  self.hapi.register(LastModifiedPlugin, function (err) {
    if (err) throw err;
  });

  self.hapi.start(function () {
    self.hapi.log(['info'], 'Server running at:' + self.hapi.info.uri);
    if (cb && typeof cb === 'function') {
      cb();
    }
  });
};

module.exports = Server;

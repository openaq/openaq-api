'use strict';

var Hapi = require('hapi');
var ua = require('universal-analytics')(process.env.GA_ID);

var Server = function (port) {
  this.port = port;
  this.hapi = new Hapi.Server({
    connections: {
      routes: {
        cors: true
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

Server.prototype.start = function (redisURL, cb) {
  var self = this;
  self.hapi.connection({ port: this.port });

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
        license: 'CC0-1.0',
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
      routes: ['/v1/measurements']
    }
  }, function (err) {
    if (err) throw err;
  });

  // Register hapi-redis
  self.hapi.register({
    register: require('hapi-redis'),
    options: {
      connection: redisURL
    }
  }, function (err) {
    if (err) {
      console.error(err);
    }
  });

  // Register good logger
  var options = {
    opsInterval: 1000,
    reporters: [{
      reporter: require('good-console'),
      events: { log: '*', response: '*', request: '*', error: '*' }
    }]
  };

  self.hapi.register({
    register: require('good'),
    options: options
  }, function (err) {
    if (err) throw err;
  });

  // Add Google Analytics to endpoints
  var GAPlugin = {
    register: function (server, options, next) {
      server.ext('onPreResponse', function (request, reply) {
        // Pass along route view, exclude ping
        if (request.route.path !== '/ping') {
          ua.pageview(request.route.path).send();
        }

        return reply.continue();
      });

      next();
    }
  };
  GAPlugin.register.attributes = {
    name: 'GAPlugin',
    version: '0.0.1'
  };
  self.hapi.register(GAPlugin, function (err) {
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

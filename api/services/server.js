'use strict';

var Hapi = require('hapi');

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

Server.prototype.start = function (cb) {
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
      excludeFormats: ['csv']
    }
  }, function (err) {
    if (err) throw err;
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

  self.hapi.start(function () {
    self.hapi.log(['info'], 'Server running at:' + self.hapi.info.uri);
    if (cb && typeof cb === 'function') {
      cb();
    }
  });
};

module.exports = Server;

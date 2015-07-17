'use strict';

var Hapi = require('hapi');

var Server = function (port) {
  this.port = port;
};

Server.prototype.start = function (cb) {
  var hapi = new Hapi.Server({
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

  hapi.connection({ port: this.port });

  // Register hapi-router
  hapi.register({
    register: require('hapi-router'),
    options: {
      routes: './api/routes/*.js'
    }
  }, function (err) {
    if (err) throw err;
  });

  // Register hapi-response-meta
  hapi.register({
    register: require('hapi-response-meta'),
    options: {
      content: {
        name: 'openaq-api',
        license: 'CC0-1.0',
        website: process.env.RESPONSE_HEADER_SERVER || 'https://docs.openaq.org/'
      },
      routes: ['/v1/measurements', '/v1/sites']
    }
  }, function (err) {
    if (err) throw err;
  });

  // Register hapi-paginate
  hapi.register({
    register: require('hapi-paginate'),
    options: {
      limit: 100,
      routes: ['/v1/measurements', '/v1/sites']
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

  hapi.register({
    register: require('good'),
    options: options
  }, function (err) {
    if (err) throw err;
  });

  hapi.start(function () {
    hapi.log(['info'], 'Server running at:' + hapi.info.uri);
    if (cb && typeof cb === 'function') {
      cb();
    }
  });
};

module.exports = Server;

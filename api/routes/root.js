'use strict';

// List all sub-level endpoints
const rootRouteHandler = function (request, reply) {
  var table = request.server.table(request.server.info.host)[0].table;
  var endpoints = [];
  table.forEach(function (route) {
    var path = route.public.path;
    if (path.startsWith(request.path) && path !== request.path) {
      endpoints.push({
        'method': route.public.method.toUpperCase(),
        'path': request.server.info.uri + path
      });
    }
  });
  return reply(endpoints);
};

module.exports = [
  {
    method: 'GET',
    path: '/',
    handler: rootRouteHandler
  },
  {
    method: 'GET',
    path: '/v1',
    handler: rootRouteHandler
  },
  // Health endpoint
  {
    method: 'GET',
    path: '/ping',
    handler: function (request, reply) {
      return reply('pong');
    }
  }
];

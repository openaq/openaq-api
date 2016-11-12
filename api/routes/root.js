'use strict';

// List all sub-level endpoints
const rootRouteHandler = (request, reply) => {
  var table = request.server.table(request.server.info.host)[0].table;
  var endpoints = [];
  table.forEach((route) => {
    var path = route.public.path;
    if (path.startsWith(request.path) && path !== request.path && path.indexOf('webhooks') === -1 && path.indexOf('upload') === -1) {
      endpoints.push({
        'method': route.public.method.toUpperCase(),
        'path': request.server.app.url + path,
        'description': route.settings.description
      });
    }
  });
  return reply(endpoints);
};

module.exports = [
  {
    method: 'GET',
    path: '/',
    handler: (request, reply) => {
      reply.redirect('/v1');
    }
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
    handler: (request, reply) => {
      return reply('pong');
    }
  }
];

'use strict';

module.exports = [
  // Redirect to docs
  {
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
      return reply.redirect('https://docs.openaq.org');
    }
  },
  // Redirect to docs
  {
    method: 'GET',
    path: '/v1',
    handler: function (request, reply) {
      return reply.redirect('https://docs.openaq.org');
    }
  },
  // Health endpoint
  {
    method: 'GET',
    path: '/ping',
    handler: function (request, reply) {
      return reply('pong');
    }
  },
];

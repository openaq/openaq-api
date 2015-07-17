'use strict';

module.exports = [
  {
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
      return reply.redirect('https://docs.openaq.org');
    }
  },
  {
    method: 'GET',
    path: '/v1',
    handler: function (request, reply) {
      return reply.redirect('https://docs.openaq.org');
    }
  }
];

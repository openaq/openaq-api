'use strict';

// TODO(aimee): Add query controller
// var m = require('../controllers/query.js');
// import { log } from '../services/logger';

/**
 * TODO(aimee): Add documentation
 * [exports description]
 * @type {Array}
 */
module.exports = [
  {
    method: ['POST'],
    path: '/v1/query',
    config: {
      description: 'Query all results using Athena.'
    },
    handler: function (request, reply) {
      // var params = {};

      // if (request.query) {
      //   params = request.query;
      // }

      // Handle it
      return reply({s3DownloadUrl: ''});
    }
  }
];

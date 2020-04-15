'use strict';

var Boom = require('boom');
var c = require('../controllers/webhooks.js');
import { log } from '../services/logger';

module.exports = [
  {
    method: ['POST'],
    path: '/v1/webhooks',
    handler: function (request, h) {
      var payload = request.payload;

      // Handle it
      return new Promise((resolve, reject) => {
        c.handleAction(payload, function (err, records, count) {
          if (err) {
            log(['error'], err);
            return reject(Boom.badRequest(err.error));
          }

          return resolve(h.response());
        });
      });
    }
  }
];

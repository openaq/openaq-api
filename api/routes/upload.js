'use strict';

var upload = require('../controllers/upload.js');
import { log } from '../services/logger';

/**
 * Undocumented upload endpoint to provide S3 presigned PUT url
 */
module.exports = [
  {
    method: ['GET'],
    path: '/v1/upload',
    handler: (request, reply) => {
      upload.getURL(request.query, (err, url) => {
        if (err) {
          log(['error'], `error: ${err.message}`);
          return reply(err);
        }

        return reply(url);
      });
    }
  }
];

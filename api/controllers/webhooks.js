'use strict';

var webhookKey = process.env.WEBHOOK_KEY || '123';

/**
* Handle incoming webhooks. Implements all protocols supported by /webhooks endpoint
*
* @param {Object} payload - Payload contains query paramters and their values
* @param {Object} redis - Refernce to Redis object
* @param {recordsCallback} cb - The callback that returns the records
*/
module.exports.handleAction = function (payload, redis, cb) {
  // Go ahead and return, we'll handle everything later
  cb(null);

  // Make sure we have an action and a good key
  if (payload.action === undefined || payload.key === undefined || payload.key !== webhookKey) {
    return;
  }

  switch (payload.action) {
    case 'DATABASE_UPDATED':
      // Dump Redis caches if we have a redis connection
      if (redis.ready) {
        redis.del('CACHED_LOCATIONS');
      }
      break;
    default:
      console.warn('Invalid action provided', payload.action);
  }
};

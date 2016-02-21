'use strict';

/**
* A wrapper for Redis usage within the system. Provides the default Redis
* client to be used around the system and a lastUpdated time for dynamic
* caching on CloudFront. Also internally handles updating lastUpdated time
* via pubsub model.
*/

let redis = require('redis');

let client;
 // Set to sometime far in future to force updates initially
let updated = 'Sat, 20 Feb 2096 15:12:22 GMT';
if (process.env.USE_REDIS) {
  console.info('Connecting to Redis');
  let redisURL = process.env.REDIS_URL || 'redis://localhost:6379';

  // Create a client for normal Redis operations
  client = redis.createClient(redisURL);

  // And create one for subscribing to updates
  let sub = redis.createClient(redisURL);

  // Set up sub handlers
  sub.on('message', (channel, message) => {
    if (channel === 'SYSTEM_UPDATES') {
      try {
        message = JSON.parse(message);
        if (message.type === 'DATABASE_UPDATED') {
          updated = message.updatedAt;
        }
      } catch (e) {
        // Nothing needed for now
      }
    }
  });

  sub.subscribe('SYSTEM_UPDATES');
}
export default client;

export function getLastUpdated () {
  return updated;
}

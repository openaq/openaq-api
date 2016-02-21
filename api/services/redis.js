'use strict';

let redis = require('redis');

let client;
if (process.env.USE_REDIS) {
  console.info('Connecting to Redis');
  let redisURL = process.env.REDIS_URL || 'redis://localhost:6379';
  client = redis.createClient(redisURL);
}

export default client;

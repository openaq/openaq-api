'use strict';

require('newrelic');
var Server = require('./api/services/server.js');
import { setServer } from './api/services/logger';

// This is a bit of a hacky way to turn on and off caching, just give it
// an invalid Redis url.
var redisURL;
if (process.env.USE_REDIS) {
  redisURL = process.env.REDIS_URL || 'redis://localhost:6379';
} else {
  redisURL = 'redis://foo';
}

// Start API server
var server = new Server(3004);
server.start(redisURL);
setServer(server);

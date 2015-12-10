'use static';

require('newrelic');
var database = require('./api/services/db.js');
var Server = require('./api/services/server.js');

// This is a bit of a hacky way to turn on and off caching, just give it
// an invalid Redis url.
var redisURL;
if (process.env.USE_REDIS) {
  redisURL = process.env.REDIS_URL || 'redis://localhost:6379';
} else {
  redisURL = 'redis://foo';
}

var dbURL = process.env.MONGOLAB_URI || 'mongodb://localhost:27017/openAQ';
database.connect(dbURL, function (err) {
  if (err) {
    return console.error(err);
  }

  // Start API server once we have a DB connection
  var server = new Server(3004);
  server.start(redisURL);
});

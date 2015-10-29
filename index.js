'use static';

require('newrelic');
var database = require('./api/services/db.js');
var Server = require('./api/services/server.js');

var redisURL = process.env.REDIS_URL || 'redis://localhost:6379';
var dbURL = process.env.MONGOLAB_URI || 'mongodb://localhost:27017/openAQ';
database.connect(dbURL, function (err) {
  if (err) {
    return console.error(err);
  }

  // Start API server once we have a DB connection
  var server = new Server(process.env.PORT || 3004);
  server.start(redisURL);
});

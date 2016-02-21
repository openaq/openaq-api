'use strict';

require('newrelic');
var Server = require('./api/services/server.js');
import { setServer } from './api/services/logger';

// Start API server
var server = new Server(3004);
server.start(() => {
  setServer(server);
});

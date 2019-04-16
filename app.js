'use strict';

require('newrelic');
var Server = require('./api/services/server.js');
import { setServer } from './api/services/logger';
import config from 'config';

// Start API server
const port = config.get('port');
var server = new Server(port);
server.start(() => {
  setServer(server);
});

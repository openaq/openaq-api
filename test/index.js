import config from 'config';
import Server from '../api/services/server';
import { db } from '../api/services/db';

const serverPort = config.get('port');
const server = new Server(serverPort);

// Export globals
global.serverPort = serverPort;
global.server = server;

describe('OpenAQ API', function () {
  before(async function () {
    await db.migrate.latest();
    await db.seed.run();
    return server.start();
  });

  require('./tests.js');

  after(async function () {
    await server.hapi.stop();
  });
});

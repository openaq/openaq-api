import config from 'config';
import path from 'path';
import Server from '../api/services/server';
import { db } from '../api/services/db';

const serverPort = config.get('port');
const server = new Server(serverPort);

// Export globals
global.server = server;
global.baseUrl = `http://127.0.0.1:${serverPort}/`;
global.apiUrl = `${global.baseUrl}v1/`;
global.fixturesPath = path.join(__dirname, 'fixtures');

describe('OpenAQ API', function () {
  before(async function () {
    await db.migrate.latest();
    await db.seed.run();
    return server.start();
  });

  require('./api-meta.js');
  require('./countries.js');
  require('./parameters.js');
  require('./upload.js');
  require('./cities.js');
  require('./measurements.js');
  require('./locations.js');
  require('./latest.js');
  require('./fetches.js');
  require('./sources.js');
  require('./webhooks.js');
  require('./utils.js');
  require('./update-locations.js');

  after(async function () {
    await server.hapi.stop();
  });
});

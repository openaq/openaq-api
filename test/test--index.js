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

  require('./test-api-meta.js');
  require('./test-athena-sync.js');
  require('./test-cities.js');
  require('./test-countries.js');
  require('./test-fetches.js');
  require('./test-latest.js');
  require('./test-locations.js');
  require('./test-locations-metadata.js');
  require('./test-measurements.js');
  require('./test-parameters.js');
  require('./test-sources.js');
  require('./test-upload.js');
  require('./test-utils.js');
  require('./test-webhooks.js');

  after(async function () {
    await server.hapi.stop(() => {});
  });
});

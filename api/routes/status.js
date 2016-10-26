'use strict';

import https from 'https';

const options = {
  host: 'api.newrelic.com',
  path: `/v2/applications/${process.env.NEW_RELIC_APP_ID}.json`,
  headers: {
    'X-Api-Key': process.env.NEW_RELIC_TOKEN
  }
};

/**
 * Undocumented status endpoint
 */
module.exports = [
  {
    method: ['GET'],
    path: '/status',
    handler: (request, reply) => {
      console.log(options);
      https.get(options, (response) => {
        // Make sure we have a valid response
        if (response.statusCode !== 200) {
          console.warn(`Couldn't fetch API Health from New Relic: ${response.statusCode}`);
          return reply({
            healthStatus: 'unknown'
          });
        }

        // Grab data
        let body = '';
        response.on('data', (chunk) => {
          body += chunk;
        });

        response.on('end', () => {
          const fullHealth = JSON.parse(body);
          return reply({
            healthStatus: fullHealth.application.health_status
          });
        });
      }).on('error', (e) => {
        console.warn(`Couldn't fetch API Health from New Relic: ${e.message}`);
        return reply({
          healthStatus: 'unknown'
        });
      });
    }
  }
];

'use strict';

const req = require('request');

const options = {
  method: 'GET',
  uri: 'https://api.newrelic.com/v2/applications/19841198.json',
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
    handler: function (request, reply) {
      req(options, function (error, response, body) {
        if (!error && response.statusCode === 200) {
          let fullHealth = JSON.parse(body);
          return reply({
            health_status: fullHealth.application.health_status
          });
        } else {
          console.log(`Couldn't fetch API Health from New Relic: ${response.statusCode} - ${response.statusMessage}`);
          return reply({});
        }
      });
    }
  }
];

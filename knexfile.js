require('babel-register');
const config = require('config');

// Get a mutable object from config
const knexConfig = JSON.parse(JSON.stringify(config.get('knex')));

// Fix pool min/max types when using environment variables
if (knexConfig.pool) {
  if (typeof knexConfig.pool.min !== 'undefined') {
    knexConfig.pool.min = parseInt(knexConfig.pool.min);
  }
  if (typeof knexConfig.pool.max !== 'undefined') {
    knexConfig.pool.max = parseInt(knexConfig.pool.max);
  }
}

module.exports = knexConfig;

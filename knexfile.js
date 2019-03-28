require('babel-register');
const config = require('config');
module.exports = config.get('knex');

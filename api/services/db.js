'use strict';

import knexConfig from '../../knexfile';
import knex from 'knex';

export const db = knex(knexConfig);
export const st = require('knex-postgis')(db);
console.info('Connected to the database!');

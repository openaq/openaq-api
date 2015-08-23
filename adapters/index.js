module.exports = require('require-dir')();

/**
 *
 * Expected data format from the adpater is like below
 * {
 *   "name": "Source Name",
 *   "measurements": [
 *      { parameter: 'pm10',
 *        date: Thu Jul 23 2015 06:40:00 GMT-0400 (EDT),
 *        value: 63,
 *        unit: 'µg/m3' },
 *     { parameter: 'pm25',
 *        date: Thu Jul 23 2015 06:40:00 GMT-0400 (EDT),
 *        value: 26,
 *        unit: 'µg/m3' }
 *   ]
 * }
 *
 */

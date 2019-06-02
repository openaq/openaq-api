'use strict';

/**
 * A simple wrapper to grab the logger associated with the top level Server
 * object and use it globally.
 */

let server;

export function setServer (s) {
  server = s;
}

export function log (level, message) {
  if (!server) {
    /* eslint-disable no-console */
    console.error('Missing server for logging.');
    return console.error(level, message);
  }
  server.hapi.log(level, message);
}

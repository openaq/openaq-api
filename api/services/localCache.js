'use strict';

/**
* A simple local cache abstraction.
*/

let localCache = {};

export function getLocalCache (key) {
  return localCache[key];
}

export function setLocalCache (key, value) {
  localCache[key] = value;
  return true;
}

export function flushLocalCache () {
  localCache = {};
}

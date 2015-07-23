'use strict';

var _ = require('lodash');

/**
 * Make sure that the data format is what the platform is expecting.
 */
exports.verifyDataFormat = function (data) {
  // Check that we have a data object with a name and measurements
  if (!data || !data.name || !data.measurements) {
    return false;
  }

  // Check to make sure name is a string
  if (typeof data.name !== 'string') {
    return false;
  }

  // Check to make sure each measurement is valid
  for (var i = 0; i < data.measurements.length; i++) {
    var m = data.measurements[i];

    // Make sure parameter is a string
    if (m.parameter === undefined || typeof m.parameter !== 'string') {
      return false;
    }

    // Make sure unit is a string
    if (m.unit === undefined || typeof m.unit !== 'string') {
      return false;
    }

    // Make sure value can be numbery (string or number for now)
    if (m.value === undefined || isNaN(Number(m.value)) === true) {
      return false;
    }

    // Make sure date is present and valid
    if (m.date === undefined || m.date instanceof Date === false) {
      return false;
    }
  }

  // If we're still here, everything is good
  return true;
};

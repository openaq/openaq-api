'use strict';

var request = require('request');
var _ = require('lodash');

exports.name = 'beijing';

exports.fetchData = function (site, cb) {
  var finalURL = site.url + '?apitoken=' + process.env.INDIA_KIMONO_TOKEN;
  request(finalURL, function (err, res, body) {
    if (err || res.statusCode !== 200) {
      console.error(err || res);
      return cb({message: 'Failure to load data url.'});
    }

    // Wrap everything in a try/catch in case something goes wrong
    try {
      // Format the data
      var data = formatData(body);

      // Make sure the data is valid
      if (data === undefined) {
        return cb({message: 'Failure to parse data.'});
      }
      cb(null, data);
    } catch (e) {
      return cb({message: 'Unknown adapter error.'});
    }
  });
};

var formatData = function (data) {
  // Wrap the JSON.parse() in a try/catch in case it fails
  try {
    data = JSON.parse(data);
  } catch (e) {
    // Return undefined to be caught elsewhere
    return undefined;
  }

  var getValue = function (measuredValue) {
    var idx = measuredValue.indexOf('\n');
    var idx2 = measuredValue.indexOf(' ', idx);
    return {
      value: measuredValue.substring(idx + 1, idx2),
      unit: measuredValue.substring(idx2 + 1, measuredValue.length)
    };
  };

  var getDate = function (dateString) {
    // Going to be ugly, but it's gotta be done
    // Strip off time, turn it into a better format, add it back on and parse
    var idx = dateString.indexOf(', ');
    var time = dateString.substring(idx + 7, dateString.length);
    time = time.split(' ');
    // Add 12 hours if it's PM
    var hour = time[1].toLowerCase() === 'pm' ? Number(time[0]) + 12 : time[0];

    // Add it back with time offset, need better way to handle this
    var s = dateString.substring(0, idx + 6) + ' ' + hour + ':00 GMT+0800';

    return new Date(s);
  };

  // Filter out measurements with no value
  var filtered = _.filter(data.results.collection1, function (m) {
    return getValue(m.measuredValue).value !== '';
  });

  // Build up pretty measurements array
  var measurements = _.map(filtered, function (m) {
    var valueObj = getValue(m.measuredValue);

    // Manually adding offset, find a better way to do this
    var date = getDate(m.date);
    return {
      parameter: m.parameter,
      date: date,
      value: valueObj.value,
      unit: valueObj.unit
    };
  });
  var parsed = {
    'name': data.name,
    'measurements': measurements
  };

  // Make sure the parameters names match with what the platform expects.
  renameParameters(parsed.measurements);

  return parsed;
};

var renameParameters = function (measurements) {
  _.map(measurements, function (m) {
    var newName;
    switch (m.parameter) {
      case 'Beijing - PM2.5':
        newName = 'pm25';
        break;
      default:
        newName = m.parameter;
        break;
    }
    m.parameter = newName;
    return m;
  });
};

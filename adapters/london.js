'use strict';

var request = require('request');
var _ = require('lodash');
var moment = require('moment-timezone');

exports.name = 'london';

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
    var idx = measuredValue.indexOf('(');
    return measuredValue.substring(0, idx);
  };

  var getDate = function (dateString) {
    var date;
    var s = dateString.replace('\n', ' ');
    // Do some magic to turn 24:00 into the next day 00:00
    if (s.match(/24:00:$/) !== null) {
      s = s.replace(/24:00:$/, '00:00:00');
      date = moment.tz(s, 'MM/DD/YYYY HH:mm:ss', 'Europe/London');
      date.add(1, 'day');
    } else {
      date = moment.tz(s, 'MM/DD/YYYY HH:mm:ss', 'Europe/London');
    }

    return date;
  };

  // Handle the fact that there are several locations in one response
  var locations = [];
  _.forEach(data.results.collection1, function (location) {
    var l = {
      name: location.Location.text,
      measurements: []
    };
    var base = {
      name: location.Location.text,
      date: location.datetimeupdated
    };
    // PM25
    var obj = _.clone(base);
    obj.parameter = 'pm25';
    obj.measuredValue = location['24hrmeanPM2.5ugm3'];
    l.measurements.push(obj);

    // PM10
    obj = _.clone(base);
    obj.parameter = 'pm10';
    obj.measuredValue = location.running24hrPM10ugm3;
    l.measurements.push(obj);

    // Ozone
    obj = _.clone(base);
    obj.parameter = 'ozone';
    obj.measuredValue = location.oone8hourmeanugm3;
    l.measurements.push(obj);

    // NO2
    obj = _.clone(base);
    obj.parameter = 'no2';
    obj.measuredValue = location.no2hourlymeanugm3;
    l.measurements.push(obj);

    // Filter out measurements with no value
    var filtered = _.filter(l.measurements, function (m) {
      var value = getValue(m.measuredValue);
      return isNaN(value) === false && getValue(m.measuredValue) !== '';
    });

    // Build up pretty measurements array
    var measurements = _.map(filtered, function (m) {
      var value = getValue(m.measuredValue);

      // Manually adding offset, find a better way to do this
      var date = getDate(m.date);
      return {
        location: m.name,
        parameter: m.parameter,
        date: date.toDate(),
        value: Number(value),
        unit: 'µg/m³'
      };
    });
    l.measurements = measurements;

    // Add to locations
    locations.push(l);
  });

  // Remove any locations without a measurement
  locations = _.filter(locations, function (l) {
    return l.measurements.length > 0;
  });

  // Flatten to one locations array
  var measurements = [];
  _.forEach(locations, function (l) {
    measurements.push(l.measurements);
  });
  measurements = _.flatten(measurements);

  return {
    name: 'unused',
    measurements: measurements
  };
};

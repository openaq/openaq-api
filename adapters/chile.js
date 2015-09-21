'use strict';

var request = require('request');
var _ = require('lodash');
var moment = require('moment-timezone');

exports.name = 'chile';

exports.fetchData = function (source, cb) {
  request(source.url, function (err, res, body) {
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

  // Filter out stations that are not online
  var onlineStations = _.filter(data, function (s) {
    return s.online === 1;
  });

  var paramMap = {
    'PM25': 'pm25',
    'PM10': 'pm10',
    '0001': 'so2', // Dióxido de azufre
    '0003': 'no2', // Dióxido de nitrógeno
    '0004': 'co', // Monóxido de carbono
    '0008': 'o3' // Ozono
  };

  var parseDate = function (m) {
    var date = moment.tz(m.date + m.hour, 'YYYY-MM-DDHH:mm', 'America/Santiago');
    return date.toDate();
  };

  // Make 'µg/m³' pretty
  var parseUnit = function (u) {
    return (u === '&micro;g/m<sup>3</sup>' || u === '&micro;g/Nm<sup>3</sup>') ? 'µg/m³' : u;
  };

  var measurements = [];

  _.forEach(onlineStations, function (s) {
    // Store the main properties for this measuring station
    var base = {
      city: s.nombre,
      location: s.key,
      coordinates: {
        latitude: s.latitud,
        longitude: s.longitud
      },
      attribution: [
        { name: 'SINCA', url: 'http://sinca.mma.gob.cl/' },
        { name: s.empresa }
      ]
    };

    // Loop over the parameters measured by this station
    _.forOwn(s.status, function (value, key) {
      var m = _.clone(base);
      m.parameter = paramMap[key];
      m.date = parseDate(value);
      m.value = Number(value.value);
      m.unit = parseUnit(value.unit);
      measurements.push(m);
    });
  });

  return {
    name: 'unused',
    measurements: measurements
  };
};

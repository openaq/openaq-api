'use strict';

var request = require('request');
var _ = require('lodash');
var cheerio = require('cheerio');
var async = require('async');
var moment = require('moment-timezone');
moment.locale('nl');

exports.name = 'netherlands';

exports.fetchData = function (source, cb) {
  var finalURL = source.url;
  request(finalURL, function (err, res, body) {
    if (err || res.statusCode !== 200) {
      console.error(err || res);
      return cb({message: 'Failure to load data url.'});
    }

    // Fetch list with available files from server
    var fileList = listApachetree(body, finalURL);

    // Filter list so it only contains the most recent group of files.
    var recentDate = _.last(fileList).date.getTime();
    var recentFiles = _.filter(fileList, function (f) {
      return f.date.getTime() === recentDate && f.size !== 0;
    });

    var tasks = [];

    _.forEach(recentFiles, function (f) {
      var task = function (cb) {
        // download the xml
        request(f.url, function (err, res, body) {
          if (err || res.statusCode !== 200) {
            return cb(err || res);
          }

          // pass the data to formatData
          var mData = formatData(f.name, body);
          cb(null, mData);
        });
      };

      tasks.push(task);
    });

    async.parallel(tasks, function (err, results) {
      if (err) {
        return console.error(err);
      }

      var result = {
        name: 'unused',
        measurements: _.flatten(results)
      };

      cb(null, result);
    });
  });
};

// Parses an Apache directory listing and returns an array with the files
// in the root
var listApachetree = function (data, url) {
  var $ = cheerio.load(data);

  var parseDate = function (ds) {
    var date = moment.tz(ds, 'DD-MMM-YYYY HH:mm', 'Europe/Amsterdam');
    return date.toDate();
  };

  var allFiles = [];

  $('tr').each(function (i, elem) {
    // Files are stored in <td>. Skip the rows that don't contain them
    if ($(this).find('td').length === 0) {
      return true;
    }

    var fp = [];
    $('td', this).each(function (i, elem) {
      fp[i] = $(this).text();
    });

    var f = {
      name: fp[1],
      url: url + fp[1],
      date: parseDate(fp[2]),
      size: fp[3].trim()
    };
    allFiles.push(f);
  });

  return allFiles;
};

var formatData = function (name, data) {
  var $ = cheerio.load(data, {xmlMode: true});

  // Determine what parameter is measured from the file-name
  var regExp = new RegExp('[0-9]+-(.+).xml');
  var p = name.match(regExp)[1].replace('.', '').toLowerCase();

  var parseDate = function (string) {
    var date = moment.tz(string, 'YYYYMMDDHHmmss', 'UTC');
    return date.toDate();
  };

  var getLocation = function (string) {
    // Some locations don't have their full ID in the XML. In that case,
    // it can always be prepended by 'NL10'
    // http://www.lml.rivm.nl/tabel/ versus http://www.lml.rivm.nl/sos/
    var li = (string.length === 3) ? ('NL10' + string) : string;
    return li;
  };

  var getCity = function (string) {
    var splitLocation = string.split('-');
    return splitLocation[0];
  };

  // RIVM has to be attributed first. If another organization is
  // mentioned, pass in it in the second place.
  var getAttribution = function (string) {
    var attribution = [{name: 'RIVM', url: 'http://www.lml.rivm.nl/'}];
    if (string !== 'RIVM') {
      var provider = {name: string};
      attribution.push(provider);
    };
    return attribution;
  };

  // Hardcode the averaging periods for PM10 and PM2.5
  var getPeriod = function (string) {
    if ((string === 'pm25') || (string === 'pm10')) {
      return {'value': 24, 'unit': 'hours'};
    }
  };

  var measurements = [];

  // Loop over each <ROW> in the XML and store the measurement
  $('ROW').each(function (i, elem) {
    var m = {
      date: parseDate($('MWAA_BEGINDATUMTIJD', this).text()),
      parameter: p,
      location: $('STAT_NAAM', this).text(),
      value: Number($('MWAA_WAARDE', this).text()),
      unit: 'µg/m3',
      stationId: getLocation($('STAT_NUMMER', this).text()),
      city: getCity($('STAT_NAAM', this).text()),
      attribution: getAttribution($('OPST_OPDR_ORGA_CODE', this).text()),
      averagingPeriod: getPeriod(p)
    };
    measurements.push(m);
  });

  return measurements;
};

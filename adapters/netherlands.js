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
    var recentDate = _.last(fileList).date.toString();
    var recentFiles = _.filter(fileList, function (e) {
      return e.date.toString() === recentDate && e.size != 0;
    });

    var tasks = [ ];

    _.forEach(recentFiles, function (e) {
      var task = function (cb) {
        // download the xml
        request(e.uri, function (err, res, body) {
          if (err || res.statusCode !== 200) {
            return cb(err || res);
          };

          // pass the data to formatData
          var mData = formatData(e.name, body);
          cb(null, mData);
        });
      };

      tasks.push(task);
    });

    async.parallel(tasks, function (err, results) {
      if (err) {
        return console.log(err);
      };

      var result = {
        name: 'unused',
        measurements: _.flatten(results)
      };

      // Wrap everything in a try/catch in case something goes wrong
      try {
        // Make sure the data is valid
        if (result === undefined) {
          return cb({message: 'Failure to parse data.'});
        }
        cb(null, result);
      } catch (e) {
        return cb({message: 'Unknown adapter error.'});
      }
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
    };

    var fp = [];
    $('td', this).each(function (i, elem) {
      fp[i] = $(this).text();
    });

    var f = {};
    f.name = fp[1];
    f.uri = url + fp[1];
    f.date = parseDate(fp[2]);
    f.size = fp[3].trim();
    allFiles.push(f);
  });

  return allFiles;
};

var formatData = function (fn, data) {
  var $ = cheerio.load(data, {xmlMode: true});

  // Determine what parameter is measured from the file-name
  var regExp = new RegExp('[0-9]+-(.+).xml');
  var p = fn.match(regExp)[1].replace('.', '').toLowerCase();

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

  var getRoad = function (string) {
    var splitLocation = string.split('-');
    // Not every location has a road
    return splitLocation[1] || '';
  };

  var measurements = [];

  // Loop over each <ROW> in the XML and store the measurement
  $('ROW').each(function (i, elem) {
    var m = {
      date: parseDate($('MWAA_BEGINDATUMTIJD', this).text()),
      parameter: p,
      location: getLocation($('STAT_NUMMER', this).text()),
      value: Number($('MWAA_WAARDE', this).text()),
      unit: 'µg/m3',
      city: getCity($('STAT_NAAM', this).text()),
      road: getRoad($('STAT_NAAM', this).text()),
      organization: $('OPST_OPDR_ORGA_CODE', this).text()
    };
    measurements.push(m);
  });

  return measurements;
};

'use strict';

var settings = require('./sources');

var async = require('async');
var _ = require('lodash');
var MongoClient = require('mongodb').MongoClient;
var mailer = require('./lib/mailer');
var utils = require('./lib/utils');

var adapters = require('./adapters');

var dbURL = process.env.MONGOLAB_URI || 'mongodb://localhost:27017/openAQ';
var measurementsCollection;

var findAdapter = function (name) {
  return _.find(adapters, function (a) {
    return a.name === name;
  });
};

var getAndSaveData = function (source) {
  return function (done) {
    // Get the appropriate adapter
    var adapter = findAdapter(source.adapter);
    if (!adapter) {
      var err = {message: 'Could not find adapter.', source: source.name};
      return done(null, err);
    }

    adapter.fetchData(source, function (err, data) {
      // If we have an error, send an email to the contacts and stop
      if (err) {
        mailer.sendFailureEmail(source.contacts, source.name, err);
        err.source = source.name;
        return done(null, err);
      }

      // Verify the data format
      var isValid = utils.verifyDataFormat(data);

      // If the data format is invalid, let the contacts know
      if (!isValid) {
        var error = {message: 'Adapter returned invalid results.', source: source.name};
        mailer.sendFailureEmail(source.contacts, source.name, error);
        return done(null, error);
      }

      // Remove any unwanted measurement fields
      var validParams = ['pm25', 'pm10', 'no2', 'so2', 'o3', 'co', 'bc'];
      data.measurements = _.filter(data.measurements, function (m) {
        return validParams.indexOf(m.parameter) !== -1;
      });

      // If we have no measurements to insert, we can exit now
      if (data.measurements && data.measurements.length === 0) {
        var msg = {
          message: 'New measurements inserted for ' + source.name + ': 0',
          source: source.name
        };
        return done(null, msg);
      }

      var bulk = measurementsCollection.initializeUnorderedBulkOp();
      _.forEach(data.measurements, function (m) {
        m.location = m.location || data.name; // use existing location if it exists
        m.country = source.country;
        m.city = source.city;
        bulk.insert(m);
      });
      bulk.execute(function (err, result) {
        if (err) {
          // No need to log this out for now
        }
        var msg = {
          message: 'New measurements inserted for ' + source.name + ': ' + result.nInserted,
          source: source.name
        };
        done(null, msg);
      });
    });
  };
};

var tasks = _.map(settings.sources, function (source) {
  return getAndSaveData(source);
});

MongoClient.connect(dbURL, function (err, db) {
  if (err) {
    return console.error(err);
  }
  console.info('Connected to database.');

  // Get collection and ensure indexes
  measurementsCollection = db.collection('measurements');
  async.parallel([
    function (done) {
      measurementsCollection.createIndex({ location: 1, parameter: 1, date: 1 }, { unique: true }, function (err) {
        done(err);
      });
    },
    function (done) {
      measurementsCollection.createIndex({ city: 1 }, { background: true }, function (err) {
        done(err);
      });
    }
  ], function (err, results) {
    if (err) {
      db.close();
      return console.error(err);
    }
    console.info('Indexes created and database ready to go.');
    async.parallel(tasks, function (err, results) {
      if (err) {
        console.error(err);
      } else {
        console.info('All data grabbed and saved.');
        console.info(results);
      }

      db.close();
    });
  });
});

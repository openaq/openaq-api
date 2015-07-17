'use strict';

var settings = require('./sites');

var async = require('async');
var _ = require('lodash');
var MongoClient = require('mongodb').MongoClient;
var mailer = require('./lib/mailer');

var adapters = require('./adapters');

var dbURL = process.env.MONGOLAB_URI || 'mongodb://localhost:27017/openAQ';
var measurementsCollection;

var findAdapter = function (name) {
  return _.find(adapters, function (a) {
    return a.name === name;
  });
};

var getAndSaveData = function (site) {
  return function (done) {
    // Get the appropriate adapter
    var adapter = findAdapter(site.adapter);
    if (!adapter) {
      var err = {message: 'Could not find adapter.', site: site.name};
      return done(null, err);
    }

    adapter.fetchData(site.url, function (err, data) {
      // If we have an error, send an email to the main contact and stop
      if (err) {
        mailer.sendFailureEmail(site.contacts, site.name, err);
        err.site = site.name;
        return done(null, err);
      }

      var bulk = measurementsCollection.initializeUnorderedBulkOp();
      _.forEach(data.measurements, function (m) {
        m.location = data.name;
        m.country = site.country;
        m.city = site.city;
        bulk.insert(m);
      });
      bulk.execute(function (err, result) {
        if (err) {
          // No need to log this out for now
        }
        var msg = {
          message: 'New measurements inserted for ' + site.name + ': ' + result.nInserted,
          site: site.name
        };
        done(null, msg);
      });
    });
  };
};

var tasks = _.map(settings.sites, function (site) {
  return getAndSaveData(site);
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

/* global describe, it, before, after */
'use strict';

var expect = require('chai').expect;
var database = require('../../api/services/db.js');
var testDb = 'openaq-test';
var _ = require('lodash');
var measurements = require('../data/measurements');

describe('Testing measurements controller functions', function () {
  var self = this;

  before(function (done) {
    var dbURL = 'mongodb://localhost:27017/' + testDb;
    database.connect(dbURL, function (err) {
      if (err) {
        return console.error(err);
      }
      self.db = database;

      // Insert records into db
      var collection = self.db.db.collection('measurements');
      _.forEach(measurements.results, function (m) {
        collection.save(m);
      });

      // And grab the controller
      self.controller = require('../../api/controllers/measurements');
      done();
    });
  });

  after(function (done) {
    self.db.drop(done);
  });

  it('should exist', function (done) {
    expect(self.controller).to.exist;
    done();
  });
});

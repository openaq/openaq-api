/* global describe, it, before, after */
'use strict';

var expect = require('chai').expect;
var database = require('../../api/services/db.js');
var Server = require('../../api/services/server.js');
var testDb = 'openaq-test';
var testPort = 2000;
var request = require('request');
var measurements = require('../data/measurements');
var _ = require('lodash');

describe('Testing measurements endpoints', function () {

  var self = this;
  self.baseURL = 'http://127.0.0.1:' + testPort + '/v1/';

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

      // Start API server once we have a DB connection
      self.server = new Server(testPort);
      self.server.start(done);
    });
  });

  after(function (done) {
    self.db.drop(function () {
      self.server.hapi.stop(null, done);
    });
  });

  it('should return something', function (done) {
    request(self.baseURL + 'measurements', function (err, response, body) {
      if (err) {
        console.log(err);
      }
      var res = JSON.parse(body);
      expect(res).to.exist;
      done();
    });
  });
});

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

describe('Testing endpoints', function () {

  var self = this;
  self.baseURL = 'http://127.0.0.1:' + testPort + '/v1/';

  before(function (done) {
    var dbURL = 'mongodb://localhost:27017/' + testDb;
    database.connect(dbURL, function (err) {
      if (err) {
        return console.error(err);
      }
      self.db = database;
      self.db.drop(function () {
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
  });

  after(function (done) {
    self.db.drop(function () {
      self.server.hapi.stop(null, done);
    });
  });

  describe('/measurements', function () {
    it('should return properly', function (done) {
      request(self.baseURL + 'measurements', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        expect(res.results.length).to.equal(100);
        done();
      });
    });

    it('has a meta block', function (done) {
      request(self.baseURL + 'measurements', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        var testMeta = { name: 'openaq-api',
          license: 'CC0-1.0',
          website: 'https://docs.openaq.org/',
          page: 1,
          limit: 100,
          found: 100
        };
        expect(res.meta).to.deep.equal(testMeta);
        done();
      });
    });

    it('should return an object like a good API', function (done) {
      request(self.baseURL + 'measurements?_id=55fc0c28dd51280300bdc190', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        var testObj = {
          _id: '55fc0c28dd51280300bdc190',
          parameter: 'pm25',
          date: '2015-09-18T13:00:00.000Z',
          value: 95,
          unit: 'µg/m³',
          location: 'Nisekh',
          country: 'MN',
          city: 'Ulaanbaatar',
          coordinates: {
            'latitude': 47.863943,
            'longitude': 106.779094
          }
        };
        expect(res.results[0]).to.deep.equal(testObj);
        done();
      });
    });

    it('should return csv when asked to', function (done) {
      request(self.baseURL + 'measurements?limit=1&format=csv&_id=55fc0c28dd51280300bdc190', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var csv = 'location,city,country,date,parameter,value,unit\nNisekh,Ulaanbaatar,MN,2015-09-18T13:00:00.000Z,pm25,95,µg/m³\n';
        expect(body).to.equal(csv);
        done();
      });
    });

    it('should allow for field selection', function (done) {
      request(self.baseURL + 'measurements?_id=55fc0c28dd51280300bdc190&include_fields=sourceName', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        var testObj = {
          _id: '55fc0c28dd51280300bdc190',
          parameter: 'pm25',
          date: '2015-09-18T13:00:00.000Z',
          value: 95,
          unit: 'µg/m³',
          location: 'Nisekh',
          country: 'MN',
          city: 'Ulaanbaatar',
          sourceName: 'Agaar.mn',
          coordinates: {
            'latitude': 47.863943,
            'longitude': 106.779094
          }
        };
        expect(res.results[0]).to.deep.equal(testObj);
        done();
      });
    });
  });

  describe('/locations', function () {
    it('should return properly', function (done) {
      request(self.baseURL + 'locations', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        expect(res.results.length).to.equal(4);
        expect(res.results[0].cities).to.be.instanceof(Array);
        done();
      });
    });

    it('has a meta block', function (done) {
      request(self.baseURL + 'locations', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        var testMeta = { name: 'openaq-api',
          license: 'CC0-1.0',
          website: 'https://docs.openaq.org/',
          page: 1,
          limit: 500,
          found: 21
        };
        expect(res.meta).to.deep.equal(testMeta);
        done();
      });
    });
  });

  describe('/sites', function () {
    it('should exist', function (done) {
      request(self.baseURL + 'sources', function (err, response, body) {
        if (err) {
          console.error(err);
        }
        var res = JSON.parse(body);
        expect(res).to.be.instanceof(Object);
        expect(response.statusCode).to.equal(200);
        done();
      });
    });
  });
});

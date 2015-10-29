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
var ObjectID = require('mongodb').ObjectID;

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
          m['_id'] = new ObjectID(m['_id']);
          m.date.utc = new Date(m.date.utc);
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
      request(self.baseURL + 'measurements?_id=561e7d31e7a1bc855f63fcb6', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        var testObj = {
          _id: '561e7d31e7a1bc855f63fcb6',
          parameter: 'pm25',
          'date': {
            'local': '2015-10-14T12:00:00-03:00',
            'utc': '2015-10-14T15:00:00.000Z'
          },
          value: 10.66,
          unit: 'µg/m³',
          location: 'Nueva Libertad',
          country: 'CL',
          city: 'Talcahuano',
          coordinates: {
            'latitude': -36.735998,
            'longitude': -73.118693
          }
        };
        expect(res.results[0]).to.deep.equal(testObj);
        done();
      });
    });

    it('should return csv when asked to', function (done) {
      request(self.baseURL + 'measurements?limit=1&format=csv&_id=561e7d31e7a1bc855f63fcb6', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var csv = 'location,city,country,utc,local,parameter,value,unit\nNueva Libertad,Talcahuano,CL,2015-10-14T15:00:00.000Z,2015-10-14T12:00:00-03:00,pm25,10.66,µg/m³\n';
        expect(body).to.equal(csv);
        done();
      });
    });

    it('should allow for field selection', function (done) {
      request(self.baseURL + 'measurements?_id=561e7d31e7a1bc855f63fcb6&include_fields=sourceName', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        var testObj = {
          _id: '561e7d31e7a1bc855f63fcb6',
          parameter: 'pm25',
          'date': {
            'local': '2015-10-14T12:00:00-03:00',
            'utc': '2015-10-14T15:00:00.000Z'
          },
          value: 10.66,
          unit: 'µg/m³',
          location: 'Nueva Libertad',
          country: 'CL',
          city: 'Talcahuano',
          sourceName: 'Chile - SINCA',
          coordinates: {
            'latitude': -36.735998,
            'longitude': -73.118693
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
        expect(res.results.length).to.equal(79);
        expect(res.results).to.be.instanceof(Array);
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
          limit: 100,
          found: 79
        };
        expect(res.meta).to.deep.equal(testMeta);
        done();
      });
    });
  });

  describe('/latest', function () {
    it('should return properly', function (done) {
      request(self.baseURL + 'latest', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        expect(res.results.length).to.equal(79);
        expect(res.results[0].measurements).to.be.instanceof(Array);
        done();
      });
    });

    it('has a meta block', function (done) {
      request(self.baseURL + 'latest', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        var testMeta = { name: 'openaq-api',
          license: 'CC0-1.0',
          website: 'https://docs.openaq.org/',
          page: 1,
          limit: 100,
          found: 79
        };
        expect(res.meta).to.deep.equal(testMeta);
        done();
      });
    });
  });
});

/* global describe, it, before, after */
'use strict';

var expect = require('chai').expect;
var database = require('../api/services/db.js');
var Server = require('../api/services/server.js');
var testDb = 'openaq-test';
var testPort = 2000;
var request = require('request');
var measurements = require('./data/measurements');
var _ = require('lodash');
var ObjectID = require('mongodb').ObjectID;
var utils = require('../lib/utils');

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
        self.server.start('redis://foo', done);
      });
    });
  });

  after(function (done) {
    self.db.drop(function () {
      self.server.hapi.stop(null, done);
    });
  });

  describe('/countries', function () {
    it('should return properly', function (done) {
      request(self.baseURL + 'countries', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        expect(res.results.length).to.equal(5);
        done();
      });
    });
  });

  describe('/cities', function () {
    it('should return properly', function (done) {
      request(self.baseURL + 'cities', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        expect(res.results.length).to.equal(47);
        done();
      });
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
          license: 'CC BY 4.0',
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
          license: 'CC BY 4.0',
          website: 'https://docs.openaq.org/'
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
          license: 'CC BY 4.0',
          website: 'https://docs.openaq.org/'
        };
        expect(res.meta).to.deep.equal(testMeta);
        done();
      });
    });
  });

  describe('/webhooks', function () {
    it('should do nothing on a GET', function (done) {
      request(self.baseURL + 'webhooks', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        expect(response.statusCode).to.equal(404);
        done();
      });
    });

    it('should do nothing without a key', function (done) {
      request.post(self.baseURL + 'webhooks', {}, function (err, response, body) {
        if (err) {
          console.error(err);
        }

        expect(response.statusCode).to.equal(400);
        done();
      });
    });

    it('should do nothing without a good action', function (done) {
      request.post(self.baseURL + 'webhooks', {key: 123, action: 'foo'}, function (err, response, body) {
        if (err) {
          console.error(err);
        }

        expect(response.statusCode).to.equal(400);
        done();
      });
    });

    it('should do something with key and action', function (done) {
      request.post(self.baseURL + 'webhooks', {form: {key: 123, action: 'DATABASE_UPDATED'}}, function (err, response, body) {
        if (err) {
          console.error(err);
        }

        expect(response.statusCode).to.equal(200);
        done();
      });
    });
  });

  describe('utils', function () {
    describe('payloadToKey', function () {
      it('should convert payloads properly', function (done) {
        var payload = {
          date_from: '2015-10-21',
          date_to: '2015-10-22',
          value_from: 20,
          value_to: 21,
          has_geo: true
        };
        var expected = 'test+date_from=2015-10-21&date_to=2015-10-22&value_from=20&value_to=21&has_geo=true';
        expect(utils.payloadToKey('test', payload)).to.equal(expected);
        done();
      });

      it('should handle no payload well', function (done) {
        var payload = {};
        var expected = 'test';
        expect(utils.payloadToKey('test', payload)).to.equal(expected);
        done();
      });
    });

    describe('queryFromParameters', function () {
      it('should convert payload data correctly', function (done) {
        var payload = {
          date_from: '2015-10-21',
          date_to: '2015-10-22',
          value_from: 20,
          value_to: 21,
          has_geo: true
        };
        var expected = {
          'coordinates': {
            '$exists': true
          },
          'date.utc': {
            '$lte': new Date('2015-10-22'),
            '$gte': new Date('2015-10-21')
          },
          'value': {
            '$gte': 20,
            '$lte': 21
          }
        };
        expect(utils.queryFromParameters(payload)).to.deep.equal(expected);
        done();
      });

      it('should convert payload dates correctly', function (done) {
        var payload = {
          date_from: '2015-10-21'
        };
        var expected = {
          'date.utc': {
            '$gte': new Date('2015-10-21')
          }
        };
        expect(utils.queryFromParameters(payload)).to.deep.equal(expected);

        payload = {
          date_to: '2015-10-21'
        };
        expected = {
          'date.utc': {
            '$lte': new Date('2015-10-21')
          }
        };
        expect(utils.queryFromParameters(payload)).to.deep.equal(expected);
        done();
      });

      it('should convert ug/m3 to be nice', function (done) {
        var payload = {
          unit: 'ug/m3'
        };
        var expected = {
          'unit': 'µg/m³'
        };
        expect(utils.queryFromParameters(payload)).to.deep.equal(expected);

        payload = {
          unit: 'ug/m³'
        };
        expected = {
          'unit': 'µg/m³'
        };
        expect(utils.queryFromParameters(payload)).to.deep.equal(expected);

        payload = {
          unit: 'µg/m3'
        };
        expected = {
          'unit': 'µg/m³'
        };
        expect(utils.queryFromParameters(payload)).to.deep.equal(expected);
        done();
      });
    });

    describe('prettyCountryName', function () {
      it('should convert name properly', function (done) {
        expect(utils.prettyCountryName('US')).to.equal('United States');
        expect(utils.prettyCountryName('FOO')).to.equal(undefined);
        done();
      });
    });
  });
});

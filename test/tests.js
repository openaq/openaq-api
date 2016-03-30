/* global describe, it, before, after */
'use strict';

var expect = require('chai').expect;
import { db } from '../api/services/db';
let knexConfig = require('../knexfile');
var Server = require('../api/services/server');
var testPort = 2000;
var request = require('request');
var utils = require('../lib/utils');

describe('Testing endpoints', function () {
  var self = this;
  self.baseURL = 'http://127.0.0.1:' + testPort + '/v1/';

  before(function (done) {
    this.timeout(0);  // Disable the timeout
    db.migrate.latest(knexConfig)
    .then(() => {
      console.info('Migrations completed, inserting seed data.');
      db.seed.run(knexConfig)
      .then(() => {
        console.info('Seed data inserted, starting tests.');
        // Start API server once we have a DB connection
        self.server = new Server(testPort);
        self.server.start(done);
      });
    });
  });

  after(function (done) {
    self.server.hapi.stop(null, done);
  });

  describe('/', function () {
    it('should redirect to latest version', function (done) {
      var options = {
        url: 'http://127.0.0.1:' + testPort + '/',
        followRedirect: false
      };

      request(options, function (err, response, body) {
        if (err) {
          console.error(err);
        }

        expect(response.statusCode).to.equal(302);
        expect(response.headers['location']).to.equal('/v1');
        done();
      });
    });
  });

  describe('/v1', function () {
    it('should list available endpoints', function (done) {
      request(self.baseURL, function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var endpointsList = [
          'cities',
          'countries',
          'fetches',
          'latest',
          'locations',
          'measurements'
        ];

        var res = JSON.parse(body);
        expect(res.results).to.be.instanceof(Array);
        expect(res.results.length).to.equal(endpointsList.length);
        done();
      });
    });
  });

  describe('/countries', function () {
    it('should return properly', function (done) {
      request(self.baseURL + 'countries', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        expect(res.results.length).to.equal(6);
        done();
      });
    });
    it('has a meta block', function (done) {
      request(self.baseURL + 'countries', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        var testMeta = { name: 'openaq-api',
          license: 'CC BY 4.0',
          website: 'https://docs.openaq.org/',
          page: 1,
          limit: 100,
          found: 6
        };
        expect(res.meta).to.deep.equal(testMeta);
        done();
      });
    });

    it('has pages', function (done) {
      request(self.baseURL + 'countries?limit=1', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        expect(res.meta.limit).to.deep.equal(1);
        expect(res.results.length).to.equal(1);
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
        expect(res.results.length).to.equal(39);
        done();
      });
    });
    it('has a meta block', function (done) {
      request(self.baseURL + 'cities', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        var testMeta = { name: 'openaq-api',
          license: 'CC BY 4.0',
          website: 'https://docs.openaq.org/',
          page: 1,
          limit: 100,
          found: 39
        };
        expect(res.meta).to.deep.equal(testMeta);
        done();
      });
    });
    it('has pages', function (done) {
      request(self.baseURL + 'cities?limit=1', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        expect(res.meta.limit).to.deep.equal(1);
        expect(res.results.length).to.equal(1);
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

    it('has pages', function (done) {
      request(self.baseURL + 'measurements?limit=1', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        expect(res.meta.limit).to.deep.equal(1);
        expect(res.results.length).to.equal(1);
        done();
      });
    });

    it('handles bad coordinates param', function (done) {
      request(self.baseURL + 'measurements?coordinates=foo', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        body = JSON.parse(body);
        expect(body.meta.found).to.equal(100);
        done();
      });
    });

    it('handles bad radius param', function (done) {
      request(self.baseURL + 'measurements?radius=foo', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        body = JSON.parse(body);
        expect(body.meta.found).to.equal(100);
        done();
      });
    });

    it('handles a coordinates search', function (done) {
      request(self.baseURL + 'measurements?coordinates=51.83,20.78&radius=1000', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        body = JSON.parse(body);
        expect(body.meta.found).to.equal(3);
        done();
      });
    });

    it('handles a coordinates search without radius', function (done) {
      request(self.baseURL + 'measurements?coordinates=51.83,20.78', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        body = JSON.parse(body);
        expect(body.meta.found).to.equal(3);
        done();
      });
    });

    it('should return an object like a good API', function (done) {
      request(self.baseURL + 'measurements?limit=1', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        expect(res.results[0]).to.be.an('object');
        expect(res.results[0].location).to.be.a('string');
        expect(res.results[0].parameter).to.be.a('string');
        expect(res.results[0].date).to.be.an('object');
        expect(res.results[0].date.utc).to.be.a('string');
        expect(res.results[0].date.local).to.be.a('string');
        expect(res.results[0].unit).to.be.a('string');
        expect(res.results[0].city).to.be.a('string');
        expect(res.results[0].country).to.be.a('string');
        expect(res.results[0].value).to.be.a('number');
        done();
      });
    });

    it('should return csv when asked to', function (done) {
      request(self.baseURL + 'measurements?limit=1&format=csv', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var lines = body.split('\n');
        expect(lines.length).to.equal(3);
        done();
      });
    });

    it('should include attribution if not asked for with csv', function (done) {
      request(self.baseURL + 'measurements?format=csv', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        expect(body.indexOf('attribution')).to.not.equal(-1);
        done();
      });
    });

    it('should include attribution if asked for alone with csv', function (done) {
      request(self.baseURL + 'measurements?format=csv&include_fields=attribution', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        expect(body.indexOf('attribution')).to.not.equal(-1);
        done();
      });
    });

    it('should include attribution if not asked for but something else is with csv', function (done) {
      request(self.baseURL + 'measurements?format=csv&include_fields=sourceName', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        expect(body.indexOf('attribution')).to.not.equal(-1);
        done();
      });
    });

    it('should return all entries in csv when no limit is set', function (done) {
      request(self.baseURL + 'measurements?format=csv', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var lines = body.split('\n');
        expect(lines.length).to.equal(102);
        done();
      });
    });

    it('should respect limit parameter for csv', function (done) {
      request(self.baseURL + 'measurements?limit=10&format=csv', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var lines = body.split('\n');
        expect(lines.length).to.equal(12);
        done();
      });
    });

    it('should allow for field selection', function (done) {
      request(self.baseURL + 'measurements?include_fields=sourceName,attribution', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        expect(res.results[0].sourceName).to.be.a('string');
        expect(res.results[0].attribution).to.be.an('array');
        expect(res.results[0].attribution[0]).to.be.an('object');
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
        expect(res.results.length).to.equal(57);
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
          website: 'https://docs.openaq.org/',
          found: 57,
          page: 1,
          limit: 100
        };
        expect(res.meta).to.deep.equal(testMeta);
        done();
      });
    });

    it('has pages', function (done) {
      request(self.baseURL + 'locations?limit=1', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        expect(res.meta.limit).to.deep.equal(1);
        expect(res.results.length).to.equal(1);
        done();
      });
    });

    it('handles a coordinates search', function (done) {
      request(self.baseURL + 'locations?coordinates=51.83,20.78&radius=1000', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        body = JSON.parse(body);
        expect(body.meta.found).to.equal(1);
        done();
      });
    });

    it('handles a coordinates search with no radius', function (done) {
      request(self.baseURL + 'locations?coordinates=51.83,20.78', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        body = JSON.parse(body);
        expect(body.meta.found).to.equal(1);
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
        expect(res.results.length).to.equal(57);
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
          website: 'https://docs.openaq.org/',
          found: 57,
          page: 1,
          limit: 100
        };
        expect(res.meta).to.deep.equal(testMeta);
        done();
      });
    });

    it('has pages', function (done) {
      request(self.baseURL + 'latest?limit=1', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        expect(res.meta.limit).to.deep.equal(1);
        expect(res.results.length).to.equal(1);
        done();
      });
    });

    it('handles a coordinates search', function (done) {
      request(self.baseURL + 'latest?coordinates=51.83,20.78&radius=1000', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        body = JSON.parse(body);
        expect(body.meta.found).to.equal(1);
        done();
      });
    });

    it('handles a coordinates search with no radius', function (done) {
      request(self.baseURL + 'latest?coordinates=51.83,20.78', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        body = JSON.parse(body);
        expect(body.meta.found).to.equal(1);
        done();
      });
    });
  });

  describe('/fetches', function () {
    it('should return properly', function (done) {
      request(self.baseURL + 'fetches', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        expect(res.results.length).to.equal(3);
        // Test top level object
        expect(res.results[0].results).to.be.an('array');
        expect(res.results[0].timeStarted).to.be.a('string');
        expect(res.results[0].timeEnded).to.be.a('string');
        expect(res.results[0].count).to.be.a('number');
        // Test individual fetch result
        expect(res.results[0].results[0]).to.be.an('object');
        expect(res.results[0].results[0].count).to.be.an('number');
        expect(res.results[0].results[0].duration).to.be.an('number');
        expect(res.results[0].results[0].message).to.be.a('string');
        expect(res.results[0].results[0].sourceName).to.be.a('string');
        expect(res.results[0].results[0].failures).to.be.an('object');
        done();
      });
    });

    it('has a meta block', function (done) {
      request(self.baseURL + 'fetches', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        var testMeta = { name: 'openaq-api',
          license: 'CC BY 4.0',
          website: 'https://docs.openaq.org/',
          found: 3,
          page: 1,
          limit: 100
        };
        expect(res.meta).to.deep.equal(testMeta);
        done();
      });
    });

    it('has pages', function (done) {
      request(self.baseURL + 'fetches?limit=1', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        expect(res.meta.limit).to.deep.equal(1);
        expect(res.results.length).to.equal(1);
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
          value_from: 20,
          value_to: 21,
          has_geo: true
        };
        var expected = {
          payload: {},
          operators: [
            {
              column: 'date_utc',
              operator: '>=',
              value: new Date('2015-10-21T00:00:00.000Z')
            }
          ],
          betweens: [
            {
              column: 'value',
              range: [20, 21]
            }
          ],
          nulls: [],
          geo: {},
          notNulls: [ { column: 'coordinates' } ]
        };

        expect(utils.queryFromParameters(payload)).to.deep.equal(expected);
        done();
      });

      it('should convert payload dates correctly', function (done) {
        var payload = {
          date_from: '2015-10-21'
        };
        var expected = {
          'betweens': [],
          'notNulls': [],
          'nulls': [],
          'geo': {},
          'operators': [
            {
              column: 'date_utc',
              operator: '>=',
              value: new Date('2015-10-21')
            }
          ],
          'payload': {}
        };
        expect(utils.queryFromParameters(payload)).to.deep.equal(expected);

        payload = {
          date_to: '2015-10-21'
        };
        expected = {
          'betweens': [],
          'notNulls': [],
          'nulls': [],
          'geo': {},
          'operators': [
            {
              column: 'date_utc',
              operator: '<=',
              value: new Date('2015-10-21')
            }
          ],
          'payload': {}
        };
        expect(utils.queryFromParameters(payload)).to.deep.equal(expected);
        done();
      });

      it('should handle geo searches properly', (done) => {
        const expected = {
          'betweens': [],
          'notNulls': [],
          'nulls': [],
          'geo': {},
          'operators': [],
          'payload': {}
        };

        //
        // Good search
        //
        let payload = {
          coordinates: '41.23,23.03',
          radius: 10
        };
        let exp = Object.assign({}, expected);
        exp.geo = {
          coordinates: {latitude: 41.23, longitude: 23.03},
          radius: 10
        };

        expect(utils.queryFromParameters(payload)).to.deep.equal(exp);

        //
        // Bad coordinates
        //
        payload = {
          coordinates: '41.23',
          radius: 10
        };
        exp = Object.assign({}, expected);

        expect(utils.queryFromParameters(payload)).to.deep.equal(exp);

        //
        // Bad coordinates
        //
        payload = {
          coordinates: '41.23,',
          radius: 10
        };
        exp = Object.assign({}, expected);

        expect(utils.queryFromParameters(payload)).to.deep.equal(exp);

        //
        // Bad coordinates
        //
        payload = {
          coordinates: 'foo',
          radius: 10
        };
        exp = Object.assign({}, expected);

        expect(utils.queryFromParameters(payload)).to.deep.equal(exp);

        //
        // Bad radius
        //
        payload = {
          coordinates: '41.23',
          radius: 'foo'
        };
        exp = Object.assign({}, expected);

        expect(utils.queryFromParameters(payload)).to.deep.equal(exp);
        done();
      });

      it('should convert ug/m3 to be nice', function (done) {
        var payload = {
          unit: 'ug/m3'
        };
        var expected = {
          'betweens': [],
          'geo': {},
          'notNulls': [],
          'nulls': [],
          'operators': [],
          'payload': {
            'unit': 'µg/m³'
          }
        };
        expect(utils.queryFromParameters(payload)).to.deep.equal(expected);

        payload = {
          unit: 'ug/m³'
        };
        expect(utils.queryFromParameters(payload)).to.deep.equal(expected);

        payload = {
          unit: 'µg/m3'
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

    describe('isGeoPayloadOK', function () {
      it('should correctly handle geo payloads', function (done) {
        let payload = {
          coordinates: '40.02,21.23',
          radius: 10
        };
        expect(utils.isGeoPayloadOK(payload)).to.be.true;

        payload = {
          coordinates: '40.02,21.23'
        };
        expect(utils.isGeoPayloadOK(payload)).to.be.true;

        payload = {
          coordinates: '40.02,',
          radius: 10
        };
        expect(utils.isGeoPayloadOK(payload)).to.be.false;

        payload = {
          coordinates: '40.02',
          radius: 10
        };
        expect(utils.isGeoPayloadOK(payload)).to.be.false;

        payload = {
          coordinates: 'foo',
          radius: 10
        };
        expect(utils.isGeoPayloadOK(payload)).to.be.false;

        payload = {
          coordinates: '40.02,21.23',
          radius: 'foo'
        };
        expect(utils.isGeoPayloadOK(payload)).to.be.false;
        done();
      });
    });
  });
});

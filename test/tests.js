/* global describe, it, before, after */
'use strict';

var expect = require('chai').expect;
import { db } from '../api/services/db';
let knexConfig = require('../knexfile');
var Server = require('../api/services/server');
var testPort = 2000;
var request = require('request');
var utils = require('../lib/utils');
import { orderBy } from 'lodash';

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
    self.server.hapi.stop(done);
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

  if (process.env.ATHENA_QUERY_OUTPUT_BUCKET) {
    describe('/query', function () {
      it('should return the expected object', function (done) {
        request(self.baseURL + 'query?limit=0', function (err, response, body) {
          if (err) {
            console.error(err);
          }

          var res = JSON.parse(body);
          expect(res.results.s3Uri).to.match(/s3:\/\/.+\.csv/);
          expect(res.results.downloadUrl).to.match(/https:\/\/.+\.csv/);
          done();
        });
      });
    });
  }

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
          'measurements',
          'parameters',
          'sources',
          'query'
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
    // https://github.com/openaq/openaq-fetch/issues/291
    it('should properly handle locations and cities counts', function (done) {
      request(self.baseURL + 'countries', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        // Get MN country
        res.results.forEach((country) => {
          if (country.code === 'MN') {
            expect(country.cities).to.equal(1);
            expect(country.locations).to.equal(9);
            done();
          }
        });
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

    it('can be ordered', (done) => {
      request(`${self.baseURL}countries?order_by=count&sort=asc`, (err, response, body) => {
        if (err) {
          console.error(err);
        }

        const res = JSON.parse(body);
        expect(res.results).to.deep.equal(orderBy(res.results, 'count', 'asc'));
        done();
      });
    });

    it('can be ordered by multiple fields and directions', (done) => {
      request(`${self.baseURL}countries?order_by[]=cities&order_by[]=locations&sort[]=asc&sort[]=desc]`, (err, response, body) => {
        if (err) {
          console.error(err);
        }

        const res = JSON.parse(body);
        expect(res.results).to.deep.equal(orderBy(res.results, ['cities', 'locations'], ['asc', 'desc']));
        done();
      });
    });

    it('should not complain about wrong order query', (done) => {
      request(`${self.baseURL}countries?order_by=non-existing-field`, (err, response, body) => {
        if (err) {
          console.error(err);
        }

        expect(response.statusCode).to.equal(200);
        done();
      });
    });
  });

  describe('/parameters', function () {
    it('should return properly', function (done) {
      request(self.baseURL + 'parameters', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        expect(res.results.length).to.equal(7);
        done();
      });
    });
    it('has a meta block', function (done) {
      request(self.baseURL + 'parameters', function (err, response, body) {
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

    it('can be ordered', (done) => {
      request(`${self.baseURL}parameters?order_by=preferredUnit`, (err, response, body) => {
        if (err) {
          console.error(err);
        }

        const res = JSON.parse(body);
        expect(res.results).to.deep.equal(orderBy(res.results, 'preferredUnit'));
        done();
      });
    });

    it('can be ordered by multiple fields and directions', (done) => {
      request(`${self.baseURL}parameters?order_by[]=id&order_by[]=name&sort[]=asc&sort[]=desc]`, (err, response, body) => {
        if (err) {
          console.error(err);
        }

        const res = JSON.parse(body);
        expect(res.results).to.deep.equal(orderBy(res.results, ['id', 'name'], ['asc', 'desc']));
        done();
      });
    });
  });

  describe('/upload', function () {
    it('should handle missing token', function (done) {
      request(self.baseURL + 'upload?filename=foo', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        expect(response.statusCode).to.equal(400);
        done();
      });
    });

    it('should handle missing filename', function (done) {
      request(self.baseURL + 'upload?token=foo', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        expect(response.statusCode).to.equal(400);
        done();
      });
    });

    it('should handle missing filename and token', function (done) {
      request(self.baseURL + 'upload', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        expect(response.statusCode).to.equal(400);
        done();
      });
    });

    it('should handle invalid token', function (done) {
      request(self.baseURL + 'upload?token=bar&filename=foo', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        expect(response.statusCode).to.equal(401);
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

    it('can be ordered', (done) => {
      request(`${self.baseURL}cities?order_by=country&sort=desc`, (err, response, body) => {
        if (err) {
          console.error(err);
        }

        const res = JSON.parse(body);
        expect(res.results).to.deep.equal(orderBy(res.results, 'country', 'desc'));
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

    it('should respect parameter query parameter', function (done) {
      request(self.baseURL + 'measurements?parameter=co', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        expect(res.meta.found).to.equal(56);
        done();
      });
    });

    it('should respect parameter as array query parameter', function (done) {
      request(self.baseURL + 'measurements?parameter[]=co&parameter[]=pm25', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        expect(res.meta.found).to.equal(71);
        done();
      });
    });

    it('should respect mix of query parameters', function (done) {
      request(self.baseURL + 'measurements?parameter[]=co&country=CL&parameter[]=so2&parameter[]=pm25', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        expect(res.meta.found).to.equal(32);
        done();
      });
    });

    it('can be ordered', function (done) {
      request(`${self.baseURL}measurements?order_by=value&sort=desc`, (err, response, body) => {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        expect(res.results[0].value).to.be.above(res.results[1].value);
        expect(res.results[0].value).to.be.above(res.results[res.results.length - 1].value);
        expect(res.results).to.deep.equal(orderBy(res.results, 'value', 'desc'));
        done();
      });
    });

    it('can be ordered with multiple fields and directions', function (done) {
      request(`${self.baseURL}measurements?order_by[]=country&order_by[]=sourceName&sort[]=desc&sort[]=desc`, (err, response, body) => {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        expect(res.results).to.deep.equal(orderBy(res.results, ['country', 'sourceName'], ['desc', 'desc']));
        done();
      });
    });

    it('should not require sorting direction when ordering', function (done) {
      request(`${self.baseURL}measurements?order_by=value`, (err, response, body) => {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        expect(res.results[0].value).to.be.below(res.results[1].value);
        expect(res.results[0].value).to.be.below(res.results[res.results.length - 1].value);
        expect(res.results).to.deep.equal(orderBy(res.results, 'value'));
        done();
      });
    });

    it('should not complain about wrong order query', (done) => {
      request(`${self.baseURL}measurements?order_by=non-existing-field&sort=asc`, (err, response, body) => {
        if (err) {
          console.error(err);
        }

        expect(response.statusCode).to.equal(200);
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

    it('handles multiple countries', function (done) {
      request(self.baseURL + 'locations?country[]=NL&country[]=PL', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        body = JSON.parse(body);
        expect(body.meta.found).to.equal(12);
        done();
      });
    });

    it('handles multiple sources', function (done) {
      request(self.baseURL + 'locations?location=Tochtermana', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        body = JSON.parse(body);
        expect(body.results[0].sourceNames.length).to.equal(2);
        done();
      });
    });

    it('handles multiple parameters', function (done) {
      request(self.baseURL + 'locations?parameter[]=co&parameter[]=pm25', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        body = JSON.parse(body);
        expect(body.meta.found).to.equal(49);
        done();
      });
    });

    it('handles multiple cities', function (done) {
      request(self.baseURL + 'locations?city[]=Siedlce&city[]=Kolkata', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        body = JSON.parse(body);
        expect(body.meta.found).to.equal(2);
        done();
      });
    });

    it('handles multiple locations', function (done) {
      request(self.baseURL + 'locations?location[]=Reja&location[]=Tochtermana', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        body = JSON.parse(body);
        expect(body.meta.found).to.equal(2);
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

    it('handles a coordinates search with nearest', function (done) {
      request(self.baseURL + 'locations?coordinates=51.83,20.78&nearest=10', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        body = JSON.parse(body);
        expect(body.meta.found).to.equal(10);
        done();
      });
    });

    it('handles a coordinates search with bad nearest', function (done) {
      request(self.baseURL + 'locations?coordinates=51.83,20.78&nearest=foo', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        body = JSON.parse(body);
        expect(body.meta.found).to.equal(57);
        done();
      });
    });

    // https://github.com/openaq/openaq-api/issues/232
    it('handles has_geo searches', function (done) {
      request(self.baseURL + 'locations?has_geo', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        body = JSON.parse(body);
        expect(body.meta.found).to.equal(56);
        done();
      });
    });

    // https://github.com/openaq/openaq-api/issues/278
    it('returns correct number for similar locations', function (done) {
      request(self.baseURL + 'locations?location=Coyhaique%20II', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        body = JSON.parse(body);
        expect(body.meta.found).to.equal(1);
        done();
      });
    });

    it('can be ordered', (done) => {
      request(`${self.baseURL}locations?order_by=count&sort=desc`, (err, response, body) => {
        if (err) {
          console.error(err);
        }

        const res = JSON.parse(body);
        expect(res.results).to.deep.equal(orderBy(res.results, 'count', 'desc'));
        done();
      });
    });

    it('can be ordered by multiple fields and directions', (done) => {
      request(`${self.baseURL}parameters?order_by[]=lastUpdated&order_by[]=country&sort[]=desc&sort[]=asc]`, (err, response, body) => {
        if (err) {
          console.error(err);
        }

        const res = JSON.parse(body);
        expect(res.results).to.deep.equal(orderBy(res.results, ['lastUpdated', 'country'], ['desc', 'asc']));
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

    it('includes distance on coordinates search', function (done) {
      request(`${self.baseURL}latest?coordinates=51.83,20.78`, function (err, response, body) {
        if (err) {
          console.error(err);
        }
        body = JSON.parse(body);
        expect(body.results[0]).to.have.property('distance');
        done();
      });
    });

    // https://github.com/openaq/openaq-api/issues/232
    it('handles has_geo searches', function (done) {
      request(self.baseURL + 'latest?has_geo', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        body = JSON.parse(body);
        expect(body.meta.found).to.equal(56);
        done();
      });
    });

    // https://github.com/openaq/openaq.org/issues/137
    it('returns source name for a measurement', function (done) {
      request(self.baseURL + 'latest', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        body = JSON.parse(body);
        body.results.forEach((r) => {
          r.measurements.forEach((m) => {
            expect(m.sourceName).to.exist;
          });
        });
        done();
      });
    });

    it('returns averaging period for a measurement', function (done) {
      request(self.baseURL + 'latest?city=Cabauw', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        body = JSON.parse(body);
        body.results.forEach((r) => {
          r.measurements.forEach((m) => {
            expect(m.averagingPeriod).to.exist;
          });
        });
        done();
      });
    });

    it('can be ordered', (done) => {
      request(`${self.baseURL}latest?order_by=city`, (err, response, body) => {
        if (err) {
          console.error(err);
        }

        const res = JSON.parse(body);
        expect(res.results).to.deep.equal(orderBy(res.results, 'city'));
        done();
      });
    });

    it('can be ordered by multiple fields and directions', (done) => {
      request(`${self.baseURL}parameters?order_by[]=country&order_by[]=city&sort[]=desc&sort[]=asc]`, (err, response, body) => {
        if (err) {
          console.error(err);
        }

        const res = JSON.parse(body);
        expect(res.results).to.deep.equal(orderBy(res.results, ['country', 'city'], ['desc', 'asc']));
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

    it('can be ordered', (done) => {
      request(`${self.baseURL}fetches?order_by=timeEnded&sort=desc`, (err, response, body) => {
        if (err) {
          console.error(err);
        }

        const res = JSON.parse(body);
        expect(res.results).to.deep.equal(orderBy(res.results, 'timeEnded', 'desc'));
        done();
      });
    });

    it('can be ordered by multiple fields and directions', (done) => {
      request(`${self.baseURL}fetches?order_by[]=timeStarted&order_by[]=count&sort[]=desc&sort[]=desc]`, (err, response, body) => {
        if (err) {
          console.error(err);
        }

        const res = JSON.parse(body);
        expect(res.results).to.deep.equal(orderBy(res.results, ['timeStarted', 'count'], ['desc', 'desc']));
        done();
      });
    });
  });

  describe('/sources', function () {
    it('should return properly', function (done) {
      request(self.baseURL + 'sources', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        expect(res.results.length).to.equal(3);
        expect(res.results[0]).to.be.an('object');
        done();
      });
    });

    it('has a meta block', function (done) {
      request(self.baseURL + 'sources', function (err, response, body) {
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
      request(self.baseURL + 'sources?limit=1', function (err, response, body) {
        if (err) {
          console.error(err);
        }

        var res = JSON.parse(body);
        expect(res.meta.limit).to.equal(1);
        expect(res.results.length).to.equal(1);
        done();
      });
    });

    it('can be ordered', (done) => {
      request(`${self.baseURL}sources?order_by=country`, (err, response, body) => {
        if (err) {
          console.error(err);
        }

        const res = JSON.parse(body);
        expect(res.results).to.deep.equal(orderBy(res.results, 'country'));
        done();
      });
    });

    it('can be ordered by multiple fields and directions', (done) => {
      request(`${self.baseURL}sources?order_by[]=adapter&order_by[]=country&sort[]=asc&sort[]=asc]`, (err, response, body) => {
        if (err) {
          console.error(err);
        }

        const res = JSON.parse(body);
        expect(res.results).to.deep.equal(orderBy(res.results, ['adapter', 'country'], ['asc', 'asc']));
        done();
      });
    });

    it('can be ordered by boolean field, false first', (done) => {
      request(`${self.baseURL}sources?order_by=active&sort=asc`, (err, response, body) => {
        if (err) {
          console.error(err);
        }

        const res = JSON.parse(body);
        expect(res.results).to.deep.equal(orderBy(res.results, 'active', 'asc'));
        expect(res.results[0].active).to.equal(false);
        done();
      });
    });

    it('can be ordered by boolean field, true first', (done) => {
      request(`${self.baseURL}sources?order_by=active&sort=desc`, (err, response, body) => {
        if (err) {
          console.error(err);
        }

        const res = JSON.parse(body);
        expect(res.results).to.deep.equal(orderBy(res.results, 'active', 'desc'));
        expect(res.results[0].active).to.equal(true);
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
          coordinates: '40.02,21.23',
          nearest: 10
        };
        expect(utils.isGeoPayloadOK(payload)).to.be.true;

        payload = {
          coordinates: '40.02,21.23',
          nearest: 'foo'
        };
        expect(utils.isGeoPayloadOK(payload)).to.be.false;

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

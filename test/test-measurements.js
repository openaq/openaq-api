import { expect } from 'chai';
import request from 'request';
import { orderBy } from 'lodash';

/* global apiUrl */

describe('/measurements', function () {
  it('should return properly', function (done) {
    request(apiUrl + 'measurements', function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      var res = JSON.parse(body);
      expect(res.results.length).to.equal(100);
      done();
    });
  });

  it('has a meta block', function (done) {
    request(apiUrl + 'measurements', function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      var res = JSON.parse(body);
      var testMeta = {
        name: 'openaq-api',
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
    request(apiUrl + 'measurements?limit=1', function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      var res = JSON.parse(body);
      expect(res.meta.limit).to.deep.equal(1);
      expect(res.results.length).to.equal(1);
      done();
    });
  });

  it('handles bad coordinates param', function (done) {
    request(apiUrl + 'measurements?coordinates=foo', function (
      err,
      response,
      body
    ) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      body = JSON.parse(body);
      expect(body.meta.found).to.equal(100);
      done();
    });
  });

  it('handles bad radius param', function (done) {
    request(apiUrl + 'measurements?radius=foo', function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      body = JSON.parse(body);
      expect(body.meta.found).to.equal(100);
      done();
    });
  });

  it('handles a coordinates search', function (done) {
    request(
      apiUrl + 'measurements?coordinates=51.83,20.78&radius=1000',
      function (err, response, body) {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(200);

        body = JSON.parse(body);
        expect(body.meta.found).to.equal(3);
        done();
      }
    );
  });

  it('handles a coordinates search without radius', function (done) {
    request(apiUrl + 'measurements?coordinates=51.83,20.78', function (
      err,
      response,
      body
    ) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      body = JSON.parse(body);
      expect(body.meta.found).to.equal(3);
      done();
    });
  });

  it('should return an object like a good API', function (done) {
    request(apiUrl + 'measurements?limit=1', function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

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
    request(apiUrl + 'measurements?limit=1&format=csv', function (
      err,
      response,
      body
    ) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      var lines = body.split('\n');
      expect(lines.length).to.equal(3);
      done();
    });
  });

  it('should include attribution if not asked for with csv', function (done) {
    request(apiUrl + 'measurements?format=csv', function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      expect(body.indexOf('attribution')).to.not.equal(-1);
      done();
    });
  });

  it('should include attribution if asked for alone with csv', function (done) {
    request(
      apiUrl + 'measurements?format=csv&include_fields=attribution',
      function (err, response, body) {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(200);

        expect(body.indexOf('attribution')).to.not.equal(-1);
        done();
      }
    );
  });

  it('should include attribution if not asked for but something else is with csv', function (done) {
    request(
      apiUrl + 'measurements?format=csv&include_fields=sourceName',
      function (err, response, body) {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(200);

        expect(body.indexOf('attribution')).to.not.equal(-1);
        done();
      }
    );
  });

  it('should return all entries in csv when no limit is set', function (done) {
    request(apiUrl + 'measurements?format=csv', function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      var lines = body.split('\n');
      expect(lines.length).to.equal(102);
      done();
    });
  });

  it('should respect limit parameter for csv', function (done) {
    request(apiUrl + 'measurements?limit=10&format=csv', function (
      err,
      response,
      body
    ) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      var lines = body.split('\n');
      expect(lines.length).to.equal(12);
      done();
    });
  });

  it('should allow for field selection', function (done) {
    request(
      apiUrl + 'measurements?include_fields=sourceName,attribution',
      function (err, response, body) {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(200);

        var res = JSON.parse(body);
        expect(res.results[0].sourceName).to.be.a('string');
        expect(res.results[0].attribution).to.be.an('array');
        expect(res.results[0].attribution[0]).to.be.an('object');
        done();
      }
    );
  });

  it('should respect parameter query parameter', function (done) {
    request(apiUrl + 'measurements?parameter=co', function (
      err,
      response,
      body
    ) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      var res = JSON.parse(body);
      expect(res.meta.found).to.equal(56);
      done();
    });
  });

  it('should respect parameter as array query parameter', function (done) {
    request(apiUrl + 'measurements?parameter[]=co&parameter[]=pm25', function (
      err,
      response,
      body
    ) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      var res = JSON.parse(body);
      expect(res.meta.found).to.equal(71);
      done();
    });
  });

  it('should respect mix of query parameters', function (done) {
    request(
      apiUrl +
        'measurements?parameter[]=co&country=CL&parameter[]=so2&parameter[]=pm25',
      function (err, response, body) {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(200);

        var res = JSON.parse(body);
        expect(res.meta.found).to.equal(32);
        done();
      }
    );
  });

  it('can be ordered', function (done) {
    request(
      `${apiUrl}measurements?order_by=value&sort=desc`,
      (err, response, body) => {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(200);

        var res = JSON.parse(body);
        expect(res.results[0].value).to.be.above(res.results[1].value);
        expect(res.results[0].value).to.be.above(
          res.results[res.results.length - 1].value
        );
        expect(res.results).to.deep.equal(
          orderBy(res.results, 'value', 'desc')
        );
        done();
      }
    );
  });

  it('can be ordered with multiple fields and directions', function (done) {
    request(
      `${apiUrl}measurements?order_by[]=country&order_by[]=sourceName&sort[]=desc&sort[]=desc`,
      (err, response, body) => {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(200);

        var res = JSON.parse(body);
        expect(res.results).to.deep.equal(
          orderBy(res.results, ['country', 'sourceName'], ['desc', 'desc'])
        );
        done();
      }
    );
  });

  it('should not require sorting direction when ordering', function (done) {
    request(`${apiUrl}measurements?order_by=value`, (err, response, body) => {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      var res = JSON.parse(body);
      expect(res.results[0].value).to.be.below(res.results[1].value);
      expect(res.results[0].value).to.be.below(
        res.results[res.results.length - 1].value
      );
      expect(res.results).to.deep.equal(orderBy(res.results, 'value'));
      done();
    });
  });

  it('should not complain about wrong order query', done => {
    request(
      `${apiUrl}measurements?order_by=non-existing-field&sort=asc`,
      (err, response, body) => {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(200);

        expect(response.statusCode).to.equal(200);
        done();
      }
    );
  });
});

import { expect } from 'chai';
import request from 'request';
import { orderBy } from 'lodash';

/* global apiUrl */

describe('/latest', function () {
  it('should return properly', function (done) {
    request(apiUrl + 'latest', function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      var res = JSON.parse(body);
      expect(res.results.length).to.equal(57);
      expect(res.results[0].measurements).to.be.instanceof(Array);
      done();
    });
  });

  it('has a meta block', function (done) {
    request(apiUrl + 'latest', function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      var res = JSON.parse(body);
      var testMeta = {
        name: 'openaq-api',
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
    request(apiUrl + 'latest?limit=1', function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      var res = JSON.parse(body);
      expect(res.meta.limit).to.deep.equal(1);
      expect(res.results.length).to.equal(1);
      done();
    });
  });

  it('handles a coordinates search', function (done) {
    request(apiUrl + 'latest?coordinates=51.83,20.78&radius=1000', function (
      err,
      response,
      body
    ) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      body = JSON.parse(body);
      expect(body.meta.found).to.equal(1);
      done();
    });
  });

  it('handles a coordinates search with no radius', function (done) {
    request(apiUrl + 'latest?coordinates=51.83,20.78', function (
      err,
      response,
      body
    ) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      body = JSON.parse(body);
      expect(body.meta.found).to.equal(1);
      done();
    });
  });

  it('includes distance on coordinates search', function (done) {
    request(`${apiUrl}latest?coordinates=51.83,20.78`, function (
      err,
      response,
      body
    ) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      body = JSON.parse(body);
      expect(body.results[0]).to.have.property('distance');
      done();
    });
  });

  // https://github.com/openaq/openaq-api/issues/232
  it('handles has_geo searches', function (done) {
    request(apiUrl + 'latest?has_geo', function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      body = JSON.parse(body);
      expect(body.meta.found).to.equal(56);
      done();
    });
  });

  // https://github.com/openaq/openaq.org/issues/137
  it('returns source name for a measurement', function (done) {
    request(apiUrl + 'latest', function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      body = JSON.parse(body);
      body.results.forEach(r => {
        r.measurements.forEach(m => {
          expect(m.sourceName).to.exist;
        });
      });
      done();
    });
  });

  it('returns averaging period for a measurement', function (done) {
    request(apiUrl + 'latest?city=Cabauw', function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      body = JSON.parse(body);
      body.results.forEach(r => {
        r.measurements.forEach(m => {
          expect(m.averagingPeriod).to.exist;
        });
      });
      done();
    });
  });

  it('can be ordered', done => {
    request(`${apiUrl}latest?order_by=city`, (err, response, body) => {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      const res = JSON.parse(body);
      expect(res.results).to.deep.equal(orderBy(res.results, 'city'));
      done();
    });
  });

  it('can be ordered by multiple fields and directions', done => {
    request(
      `${apiUrl}parameters?order_by[]=country&order_by[]=city&sort[]=desc&sort[]=asc]`,
      (err, response, body) => {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(200);

        const res = JSON.parse(body);
        expect(res.results).to.deep.equal(
          orderBy(res.results, ['country', 'city'], ['desc', 'asc'])
        );
        done();
      }
    );
  });
});

import { expect } from 'chai';
import request from 'request';
import { orderBy } from 'lodash';

/* global apiUrl */

describe('/countries', function () {
  it('should return properly', function (done) {
    request(apiUrl + 'countries', function (err, response, body) {
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
    request(apiUrl + 'countries', function (err, response, body) {
      if (err) {
        console.error(err);
      }

      var res = JSON.parse(body);
      // Get MN country
      res.results.forEach(country => {
        if (country.code === 'MN') {
          expect(country.cities).to.equal(1);
          expect(country.locations).to.equal(9);
          done();
        }
      });
    });
  });
  it('has a meta block', function (done) {
    request(apiUrl + 'countries', function (err, response, body) {
      if (err) {
        console.error(err);
      }

      var res = JSON.parse(body);
      var testMeta = {
        name: 'openaq-api',
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
    request(apiUrl + 'countries?limit=1', function (
      err,
      response,
      body
    ) {
      if (err) {
        console.error(err);
      }

      var res = JSON.parse(body);
      expect(res.meta.limit).to.deep.equal(1);
      expect(res.results.length).to.equal(1);
      done();
    });
  });

  it('can be ordered', done => {
    request(
      `${apiUrl}countries?order_by=count&sort=asc`,
      (err, response, body) => {
        if (err) {
          console.error(err);
        }

        const res = JSON.parse(body);
        expect(res.results).to.deep.equal(
          orderBy(res.results, 'count', 'asc')
        );
        done();
      }
    );
  });

  it('can be ordered by multiple fields and directions', done => {
    request(
      `${
        apiUrl
      }countries?order_by[]=cities&order_by[]=locations&sort[]=asc&sort[]=desc]`,
      (err, response, body) => {
        if (err) {
          console.error(err);
        }

        const res = JSON.parse(body);
        expect(res.results).to.deep.equal(
          orderBy(res.results, ['cities', 'locations'], ['asc', 'desc'])
        );
        done();
      }
    );
  });

  it('should not complain about wrong order query', done => {
    request(
      `${apiUrl}countries?order_by=non-existing-field`,
      (err, response, body) => {
        if (err) {
          console.error(err);
        }

        expect(response.statusCode).to.equal(200);
        done();
      }
    );
  });
});

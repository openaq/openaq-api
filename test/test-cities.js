import { expect } from 'chai';
import request from 'request';
import { orderBy } from 'lodash';

/* global apiUrl */

describe('/cities', function () {
  it('should return properly', function (done) {
    request(apiUrl + 'cities', function (err, response, body) {
      if (err) {
        console.error(err);
      }

      var res = JSON.parse(body);
      expect(res.results.length).to.equal(39);
      done();
    });
  });
  it('has a meta block', function (done) {
    request(apiUrl + 'cities', function (err, response, body) {
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
        found: 39
      };
      expect(res.meta).to.deep.equal(testMeta);
      done();
    });
  });
  it('has pages', function (done) {
    request(apiUrl + 'cities?limit=1', function (err, response, body) {
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
      `${apiUrl}cities?order_by=country&sort=desc`,
      (err, response, body) => {
        if (err) {
          console.error(err);
        }

        const res = JSON.parse(body);
        expect(res.results).to.deep.equal(
          orderBy(res.results, 'country', 'desc')
        );
        done();
      }
    );
  });
});

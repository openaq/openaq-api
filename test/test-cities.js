import { expect } from 'chai';
import request from 'request';
import { orderBy } from 'lodash';
import fixtures from './fixtures';

/* global apiUrl */

describe('/cities', function () {
  // Populate cities table before testing.
  before(async function () {
    await fixtures('cities-2018');
  });

  it('should return properly', function (done) {
    request(apiUrl + 'cities', function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      var res = JSON.parse(body);
      expect(res.results.length).to.equal(100);
      done();
    });
  });

  it('has a meta block', function (done) {
    request(apiUrl + 'cities', function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      var res = JSON.parse(body);
      var testMeta = {
        name: 'openaq-api',
        license: 'CC BY 4.0',
        website: 'https://docs.openaq.org/',
        page: 1,
        limit: 100,
        found: 388
      };
      expect(res.meta).to.deep.equal(testMeta);
      done();
    });
  });

  it('has pages', function (done) {
    request(apiUrl + 'cities?limit=1', function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

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
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(200);

        const res = JSON.parse(body);
        expect(res.results).to.deep.equal(
          orderBy(res.results, 'country', 'desc')
        );
        done();
      }
    );
  });
});

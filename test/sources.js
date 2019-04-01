import { expect } from 'chai';
import request from 'request';
import { orderBy } from 'lodash';

/* global apiUrl */

describe('/sources', function () {
  it('should return properly', function (done) {
    request(apiUrl + 'sources', function (err, response, body) {
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
    request(apiUrl + 'sources', function (err, response, body) {
      if (err) {
        console.error(err);
      }

      var res = JSON.parse(body);
      var testMeta = {
        name: 'openaq-api',
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
    request(apiUrl + 'sources?limit=1', function (err, response, body) {
      if (err) {
        console.error(err);
      }

      var res = JSON.parse(body);
      expect(res.meta.limit).to.equal(1);
      expect(res.results.length).to.equal(1);
      done();
    });
  });

  it('can be ordered', done => {
    request(`${apiUrl}sources?order_by=country`, (err, response, body) => {
      if (err) {
        console.error(err);
      }

      const res = JSON.parse(body);
      expect(res.results).to.deep.equal(orderBy(res.results, 'country'));
      done();
    });
  });

  it('can be ordered by multiple fields and directions', done => {
    request(
      `${apiUrl}sources?order_by[]=adapter&order_by[]=country&sort[]=asc&sort[]=asc]`,
      (err, response, body) => {
        if (err) {
          console.error(err);
        }

        const res = JSON.parse(body);
        expect(res.results).to.deep.equal(
          orderBy(res.results, ['adapter', 'country'], ['asc', 'asc'])
        );
        done();
      }
    );
  });

  it('can be ordered by boolean field, false first', done => {
    request(
      `${apiUrl}sources?order_by=active&sort=asc`,
      (err, response, body) => {
        if (err) {
          console.error(err);
        }

        const res = JSON.parse(body);
        expect(res.results).to.deep.equal(
          orderBy(res.results, 'active', 'asc')
        );
        expect(res.results[0].active).to.equal(false);
        done();
      }
    );
  });

  it('can be ordered by boolean field, true first', done => {
    request(
      `${apiUrl}sources?order_by=active&sort=desc`,
      (err, response, body) => {
        if (err) {
          console.error(err);
        }

        const res = JSON.parse(body);
        expect(res.results).to.deep.equal(
          orderBy(res.results, 'active', 'desc')
        );
        expect(res.results[0].active).to.equal(true);
        done();
      }
    );
  });
});

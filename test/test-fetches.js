import { expect } from 'chai';
import request from 'request';
import { orderBy } from 'lodash';

/* global apiUrl */

describe('/fetches', function () {
  it('should return properly', function (done) {
    request(apiUrl + 'fetches', function (err, response, body) {
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
    request(apiUrl + 'fetches', function (err, response, body) {
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
    request(apiUrl + 'fetches?limit=1', function (err, response, body) {
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
      `${apiUrl}fetches?order_by=timeEnded&sort=desc`,
      (err, response, body) => {
        if (err) {
          console.error(err);
        }

        const res = JSON.parse(body);
        expect(res.results).to.deep.equal(
          orderBy(res.results, 'timeEnded', 'desc')
        );
        done();
      }
    );
  });

  it('can be ordered by multiple fields and directions', done => {
    request(
      `${apiUrl}fetches?order_by[]=timeStarted&order_by[]=count&sort[]=desc&sort[]=desc]`,
      (err, response, body) => {
        if (err) {
          console.error(err);
        }

        const res = JSON.parse(body);
        expect(res.results).to.deep.equal(
          orderBy(res.results, ['timeStarted', 'count'], ['desc', 'desc'])
        );
        done();
      }
    );
  });
});

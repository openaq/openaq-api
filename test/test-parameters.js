import { expect } from 'chai';
import request from 'request';
import { orderBy } from 'lodash';

/* global apiUrl */

describe('/parameters', function () {
  it('should return properly', function (done) {
    request(apiUrl + 'parameters', function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      var res = JSON.parse(body);
      expect(res.results.length).to.equal(7);
      done();
    });
  });
  it('has a meta block', function (done) {
    request(apiUrl + 'parameters', function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      var res = JSON.parse(body);
      var testMeta = {
        name: 'openaq-api',
        license: 'CC BY 4.0',
        website: 'https://docs.openaq.org/'
      };
      expect(res.meta).to.deep.equal(testMeta);
      done();
    });
  });

  it('can be ordered', done => {
    request(
      `${apiUrl}parameters?order_by=preferredUnit`,
      (err, response, body) => {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(200);

        const res = JSON.parse(body);
        expect(res.results).to.deep.equal(
          orderBy(res.results, 'preferredUnit')
        );
        done();
      }
    );
  });

  it('can be ordered by multiple fields and directions', done => {
    request(
      `${apiUrl}parameters?order_by[]=id&order_by[]=name&sort[]=asc&sort[]=desc]`,
      (err, response, body) => {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(200);

        const res = JSON.parse(body);
        expect(res.results).to.deep.equal(
          orderBy(res.results, ['id', 'name'], ['asc', 'desc'])
        );
        done();
      }
    );
  });
});

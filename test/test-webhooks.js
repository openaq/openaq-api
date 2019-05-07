import { expect } from 'chai';
import request from 'request';

/* global apiUrl */

describe('/webhooks', function () {
  it('should do nothing on a GET', function (done) {
    request(apiUrl + 'webhooks', function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(404);
      done();
    });
  });

  it('should do nothing without a key', function (done) {
    request.post(apiUrl + 'webhooks', {}, function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(400);
      done();
    });
  });

  it('should do nothing without a good action', function (done) {
    request.post(apiUrl + 'webhooks', { key: 123, action: 'foo' }, function (
      err,
      response,
      body
    ) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(400);
      done();
    });
  });

  it('should do something with key and action', function (done) {
    request.post(
      apiUrl + 'webhooks',
      { form: { key: 123, action: 'DATABASE_UPDATED' } },
      function (err, response, body) {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(200);
        done();
      }
    );
  });
});

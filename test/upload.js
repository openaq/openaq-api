import { expect } from 'chai';
import request from 'request';

/* global apiUrl */

describe('/upload', function () {
  it('should handle missing token', function (done) {
    request(apiUrl + 'upload?filename=foo', function (err, response, body) {
      if (err) {
        console.error(err);
      }

      expect(response.statusCode).to.equal(400);
      done();
    });
  });

  it('should handle missing filename', function (done) {
    request(apiUrl + 'upload?token=foo', function (err, response, body) {
      if (err) {
        console.error(err);
      }

      expect(response.statusCode).to.equal(400);
      done();
    });
  });

  it('should handle missing filename and token', function (done) {
    request(apiUrl + 'upload', function (err, response, body) {
      if (err) {
        console.error(err);
      }

      expect(response.statusCode).to.equal(400);
      done();
    });
  });

  it('should handle invalid token', function (done) {
    request(apiUrl + 'upload?token=bar&filename=foo', function (
      err,
      response,
      body
    ) {
      if (err) {
        console.error(err);
      }

      expect(response.statusCode).to.equal(401);
      done();
    });
  });
});

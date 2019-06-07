import { expect } from 'chai';
import request from 'request';

/* global baseUrl,apiUrl */

describe('/', function () {
  it('should redirect to latest version', function (done) {
    var options = {
      url: baseUrl,
      followRedirect: false
    };

    request(options, function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(302);
      expect(response.headers['location']).to.equal('/v1');
      done();
    });
  });
});

describe('/v1', function () {
  it('should list available endpoints', function (done) {
    request(apiUrl, function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      var endpointsList = [
        'cities',
        'countries',
        'fetches',
        'latest',
        'locations',
        'locations-metadata',
        'locations-metadata list',
        'PUT locations-metadata',
        'measurements',
        'parameters',
        'sources'
      ];

      var res = JSON.parse(body);
      expect(res.results).to.be.instanceof(Array);
      expect(res.results.length).to.equal(endpointsList.length);
      done();
    });
  });
});

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
      if (err) {
        console.error(err);
      }

      expect(response.statusCode).to.equal(302);
      expect(response.headers['location']).to.equal('/v1');
      done();
    });
  });
});

describe('/v1', function () {
  it('should list available endpoints', function (done) {
    request(apiUrl, function (err, response, body) {
      if (err) {
        console.error(err);
      }

      var endpointsList = [
        'cities',
        'countries',
        'fetches',
        'latest',
        'locations',
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

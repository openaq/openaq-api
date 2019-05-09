import { orderBy } from 'lodash';
import { expect } from 'chai';
import request from 'request';
import fixtures from './fixtures';

/* global apiUrl */

describe('/locations', function () {
  before(async function () {
    await fixtures('locations-2016');
  });

  it('should return properly', function (done) {
    request(apiUrl + 'locations', function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      const res = JSON.parse(body);
      expect(res.results.length).to.equal(100);
      expect(res.results).to.be.instanceof(Array);

      // Check location lon, lat and coordinates as GeoJSON
      const location = res.results[10];
      expect(location.lon).to.eq(-2.35416);
      expect(location.lat).to.eq(51.39113);
      expect(location.coordinates).to.deep.eq({
        type: 'Feature',
        properties: {},
        geometry: {
          coordinates: [-2.35416, 51.39113],
          type: 'Point'
        }
      });

      done();
    });
  });

  it('has a meta block', function (done) {
    request(apiUrl + 'locations', function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      const res = JSON.parse(body);
      const testMeta = {
        name: 'openaq-api',
        license: 'CC BY 4.0',
        website: 'https://docs.openaq.org/',
        found: 269,
        page: 1,
        limit: 100
      };
      expect(res.meta).to.deep.equal(testMeta);
      done();
    });
  });

  it('has pages', function (done) {
    request(apiUrl + 'locations?limit=1', function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      const res = JSON.parse(body);
      expect(res.meta.limit).to.deep.equal(1);
      expect(res.results.length).to.equal(1);
      done();
    });
  });

  it('handles multiple countries', function (done) {
    request(apiUrl + 'locations?country[]=NL&country[]=PL', function (
      err,
      response,
      body
    ) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      body = JSON.parse(body);
      expect(body.meta.found).to.equal(108);
      done();
    });
  });

  it('handles multiple sources', function (done) {
    request(apiUrl + 'locations?location=London Hillingdon', function (
      err,
      response,
      body
    ) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      body = JSON.parse(body);
      expect(body.results[0].sourceNames.length).to.equal(2);
      done();
    });
  });

  it('handles multiple parameters', function (done) {
    request(apiUrl + 'locations?parameter[]=co&parameter[]=pm25', function (
      err,
      response,
      body
    ) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      body = JSON.parse(body);
      expect(body.meta.found).to.equal(141);
      done();
    });
  });

  it('handles multiple cities', function (done) {
    request(apiUrl + 'locations?city[]=London&city[]=Warszawa', function (
      err,
      response,
      body
    ) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      body = JSON.parse(body);
      expect(body.meta.found).to.equal(25);
      done();
    });
  });

  it('handles multiple locations', function (done) {
    request(
      apiUrl + 'locations?location[]=Reja&location[]=Tochtermana',
      function (err, response, body) {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(200);

        body = JSON.parse(body);
        expect(body.meta.found).to.equal(2);
        done();
      }
    );
  });

  it('handles a coordinates search', function (done) {
    request(apiUrl + 'locations?coordinates=51.83,20.78&radius=1000', function (
      err,
      response,
      body
    ) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      body = JSON.parse(body);
      expect(body.meta.found).to.equal(1);
      done();
    });
  });

  it('handles a coordinates search with no radius', function (done) {
    request(apiUrl + 'locations?coordinates=51.83,20.78', function (
      err,
      response,
      body
    ) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      body = JSON.parse(body);
      expect(body.meta.found).to.equal(269);
      done();
    });
  });

  it('handles a coordinates search with nearest', function (done) {
    request(apiUrl + 'locations?coordinates=51.83,20.78&nearest=10', function (
      err,
      response,
      body
    ) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(400);

      body = JSON.parse(body);
      expect(body.message).to.equal('"nearest" is not allowed');
      done();
    });
  });

  it('handles has_geo=true searches', function (done) {
    request(apiUrl + 'locations?has_geo=true', function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      body = JSON.parse(body);
      expect(body.meta.found).to.equal(267);
      done();
    });
  });

  it('handles has_geo=false searches', function (done) {
    request(apiUrl + 'locations?has_geo=false', function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      body = JSON.parse(body);
      expect(body.meta.found).to.equal(2);
      done();
    });
  });

  // https://github.com/openaq/openaq-api/issues/278
  it('returns correct number for similar locations', function (done) {
    request(apiUrl + 'locations?location=lond', function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      body = JSON.parse(body);
      expect(body.meta.found).to.equal(13);
      done();
    });
  });

  it('can be ordered', done => {
    request(
      `${apiUrl}locations?order_by=count&sort=desc`,
      (err, response, body) => {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(200);

        const res = JSON.parse(body);
        expect(res.results).to.deep.equal(
          orderBy(res.results, 'count', 'desc')
        );
        done();
      }
    );
  });

  it('can be ordered by multiple fields and directions', done => {
    request(
      `${apiUrl}parameters?order_by[]=lastUpdated&order_by[]=country&sort[]=desc&sort[]=asc]`,
      (err, response, body) => {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(200);

        const res = JSON.parse(body);
        expect(res.results).to.deep.equal(
          orderBy(res.results, ['lastUpdated', 'country'], ['desc', 'asc'])
        );
        done();
      }
    );
  });
});

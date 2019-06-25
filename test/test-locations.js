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
      expect(location).to.deep.eq({
        id: 'GB-123',
        city: 'Bath',
        cities: ['Bath'],
        coordinates: { latitude: 51.39113, longitude: -2.35416 },
        count: 5240,
        country: 'GB',
        countsByMeasurement: [
          {
            count: 5240,
            parameter: 'no2'
          }
        ],
        firstUpdated: '2016-02-27T21:00:00.000Z',
        lastUpdated: '2016-12-31T22:00:00.000Z',
        location: 'Bath Roadside',
        locations: ['Bath Roadside'],
        parameters: ['no2'],
        sourceName: 'DEFRA',
        sourceNames: ['DEFRA'],
        sourceType: 'government',
        sourceTypes: ['government']
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
    request(apiUrl + 'locations?coordinates=52.3854,4.87575&radius=50000', function (
      err,
      response,
      body
    ) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      body = JSON.parse(body);
      expect(body.meta.found).to.equal(38);
      done();
    });
  });

  it('handles a coordinates search with no radius', function (done) {
    request(apiUrl + 'locations?coordinates=52.3854,4.87575', function (
      err,
      response,
      body
    ) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      body = JSON.parse(body);
      expect(body.meta.found).to.equal(6);
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

describe('/locations?metadata=true', function () {
  before(async function () {
    await fixtures('locations-2016');
    await fixtures('locations-metadata');
  });

  it('includes metadata when flag is passed', done => {
    request(
      `${apiUrl}locations?metadata=true&limit=2`,
      (err, response, body) => {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(200);

        const res = JSON.parse(body);
        expect(res.results[0].metadata).to.be.null;
        expect(res.results[0].metadataVersion).to.be.null;
        expect(res.results[0].metadataUserId).to.be.null;
        expect(res.results[0].metadataUpdatedAt).to.be.null;
        expect(res.results[0].metadataCompleteness).to.be.null;
        expect(res.results[1].metadata).to.deep.equal({
          name: 'meta-87',
          instruments: [
            {
              type: 'test-instrument',
              active: true,
              parameters: ['03'],
              serialNumber: 'abc87'
            }
          ],
          siteType: 'unlabeled',
          activationDate: '2019-03-29T00:00:00.000Z'
        });
        expect(res.results[1].metadataVersion).to.equal('2');
        expect(res.results[1].metadataUserId).to.equal('test|12345');
        expect(res.results[1].metadataUpdatedAt).to.equal('2019-01-01T00:01:27.000Z');
        expect(res.results[1].metadataCompleteness).to.equal(0.318182);
        done();
      }
    );
  });

  it('does not include metadata by default', done => {
    request(
      `${apiUrl}locations?limit=2`,
      (err, response, body) => {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(200);

        const res = JSON.parse(body);
        expect(res.results[0]).to.not.have.property('metadata');
        expect(res.results[0]).to.not.have.property('metadataVersion');
        expect(res.results[0]).to.not.have.property('metadataUserId');
        expect(res.results[0]).to.not.have.property('metadataUpdatedAt');
        expect(res.results[0]).to.not.have.property('metadataCompleteness');
        expect(res.results[1]).to.not.have.property('metadata');
        expect(res.results[1]).to.not.have.property('metadataVersion');
        expect(res.results[1]).to.not.have.property('metadataUserId');
        expect(res.results[1]).to.not.have.property('metadataUpdatedAt');
        expect(res.results[1]).to.not.have.property('metadataCompleteness');
        done();
      }
    );
  });

  it('returns locations with correct siteType', done => {
    request(
      `${apiUrl}locations?metadata=true&siteType=urban`,
      (err, response, body) => {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(200);

        const res = JSON.parse(body);
        expect(res.meta.found).to.equal(13);
        expect(res.results[0].metadata.siteType).to.equal('urban');
        done();
      }
    );
  });

  it('returns locations with correct siteType[]', done => {
    request(
      `${apiUrl}locations?metadata=true&siteType=rural&siteType=urban`,
      (err, response, body) => {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(200);

        const res = JSON.parse(body);
        expect(res.meta.found).to.equal(26);
        // Get all the diferent unique instances of siteType.
        const siteType = res.results.reduce((set, r) => set.add(r.metadata.siteType), new Set());
        expect(siteType.size).to.equal(2);
        done();
      }
    );
  });

  it('returns locations between given activationDate', done => {
    request(
      `${apiUrl}locations?metadata=true&activationDate=2019-01-01T00:00:00.000Z&activationDate=2019-01-04T01:00:00.000Z`,
      (err, response, body) => {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(200);

        const res = JSON.parse(body);
        expect(res.meta.found).to.equal(2);
        expect(res.results[0].metadata.activationDate).to.equal('2019-01-04T00:00:00.000Z');
        expect(res.results[1].metadata.activationDate).to.equal('2019-01-02T00:00:00.000Z');
        done();
      }
    );
  });

  it('returns locations between given activationDate regardless order', done => {
    request(
      `${apiUrl}locations?metadata=true&activationDate=2019-01-04T01:00:00.000Z&activationDate=2019-01-01T00:00:00.000Z`,
      (err, response, body) => {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(200);

        const res = JSON.parse(body);
        expect(res.meta.found).to.equal(2);
        expect(res.results[0].metadata.activationDate).to.equal('2019-01-04T00:00:00.000Z');
        expect(res.results[1].metadata.activationDate).to.equal('2019-01-02T00:00:00.000Z');
        done();
      }
    );
  });

  it('returns locations between given completeness', done => {
    request(
      `${apiUrl}locations?metadata=true&completeness=0.5&completeness=1`,
      (err, response, body) => {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(200);

        const res = JSON.parse(body);
        expect(res.meta.found).to.equal(1);
        expect(res.results[0].metadataCompleteness).to.equal(1);
        done();
      }
    );
  });

  it('returns locations between given completeness 2', done => {
    request(
      `${apiUrl}locations?metadata=true&completeness=0.1&completeness=0.2`,
      (err, response, body) => {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(200);

        const res = JSON.parse(body);
        expect(res.meta.found).to.equal(0);
        done();
      }
    );
  });

  it('returns locations between given completeness regardless order', done => {
    request(
      `${apiUrl}locations?metadata=true&completeness=1&completeness=0.5`,
      (err, response, body) => {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(200);

        const res = JSON.parse(body);
        expect(res.meta.found).to.equal(1);
        expect(res.results[0].metadataCompleteness).to.equal(1);
        done();
      }
    );
  });
});

describe('/locations/:id', function () {
  before(async function () {
    await fixtures('locations-2016');
    await fixtures('locations-metadata');
  });

  it('should not return metadata by default', function (done) {
    request(`${apiUrl}locations/GB-1`, function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      const res = JSON.parse(body);
      expect(res).to.not.have.property('metadata');
      expect(res).to.not.have.property('metadataVersion');
      expect(res).to.not.have.property('metadataUserId');
      expect(res).to.not.have.property('metadataUpdatedAt');
      expect(res).to.not.have.property('metadataCompleteness');
      done();
    });
  });

  it('should return metadata for location', function (done) {
    request(`${apiUrl}locations/GB-1?metadata=true`, function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      const res = JSON.parse(body);
      const expected = {
        id: 2,
        locationId: 'GB-1',
        userId: 'test|12345',
        data: {
          name: 'meta-1',
          instruments: [
            {
              type: 'test-instrument',
              active: true,
              parameters: ['03'],
              serialNumber: 'abc1'
            }
          ],
          activationDate: '2019-01-02T00:00:00.000Z',
          siteType: 'rural'
        },
        createdAt: '2019-01-01T00:00:00.000Z',
        updatedAt: '2019-01-01T00:00:01.000Z',
        version: '2'
      };

      expect(res.results.metadata).to.deep.equal(expected.data);
      expect(res.results.metadataVersion).to.equal(expected.version);
      expect(res.results.metadataUserId).to.equal(expected.userId);
      expect(res.results.metadataUpdatedAt).to.equal(expected.updatedAt);

      done();
    });
  });

  it('has a meta block', function (done) {
    request(`${apiUrl}locations/GB-1?metadata=true`, function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(200);

      const res = JSON.parse(body);
      const testMeta = {
        name: 'openaq-api',
        license: 'CC BY 4.0',
        website: 'https://docs.openaq.org/'
      };
      expect(res.meta).to.deep.equal(testMeta);
      done();
    });
  });

  it('returns 404 when the location is not found', function (done) {
    request(`${apiUrl}locations/invalid?metadata=true`, function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(404);

      const res = JSON.parse(body);
      expect(res.message).to.equal('Location was not found');
      done();
    });
  });
});

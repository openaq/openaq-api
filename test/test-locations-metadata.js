import { expect } from 'chai';
import request from 'request';

import fixtures from './fixtures';
import { db } from '../api/services/db';

/* global apiUrl */

describe('/locations/{id}/metadata', function () {
  before(async function () {
    await fixtures('locations-2016');
    await fixtures('locations-metadata');
  });

  it('should return metadata for location', function (done) {
    request(`${apiUrl}locations/GB-1/metadata`, function (err, response, body) {
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
              pollutants: ['03'],
              serialNumber: 'abc1'
            }
          ]
        },
        createdAt: '2019-01-01T00:00:00.000Z',
        updatedAt: '2019-01-01T00:00:01.000Z',
        version: '2'
      };

      expect(res.results).to.deep.equal(expected);

      done();
    });
  });

  it('has a meta block', function (done) {
    request(`${apiUrl}locations/GB-1/metadata`, function (err, response, body) {
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
    request(`${apiUrl}locations/invalid/metadata`, function (err, response, body) {
      expect(err).to.be.null;
      expect(response.statusCode).to.equal(404);

      const res = JSON.parse(body);
      expect(res.message).to.equal('Location metadata was not found');
      done();
    });
  });

  it('should fail when required payload items are missing', async function () {
    await metadataSchemaTest({}, 'child "name" fails because ["name" is required]');
    await metadataSchemaTest({
      name: 'test'
    }, 'child "instruments" fails because ["instruments" is required]');
    await metadataSchemaTest({
      name: 'test',
      instruments: []
    }, 'child "instruments" fails because ["instruments" does not contain 1 required value(s)]');
    await metadataSchemaTest({
      name: 'test',
      instruments: [{}]
    }, 'child "instruments" fails because ["instruments" at position 0 fails because [child "type" fails because ["type" is required]]]');
    await metadataSchemaTest({
      name: 'test',
      instruments: [{
        type: 'test-sensor'
      }]
    }, 'child "instruments" fails because ["instruments" at position 0 fails because [child "serialNumber" fails because ["serialNumber" is required]]]');
    await metadataSchemaTest({
      name: 'test',
      instruments: [{
        type: 'test-sensor',
        serialNumber: '123'
      }]
    }, 'child "instruments" fails because ["instruments" at position 0 fails because [child "pollutants" fails because ["pollutants" is required]]]');
    await metadataSchemaTest({
      name: 'test',
      instruments: [{
        type: 'test-sensor',
        serialNumber: '123',
        pollutants: []
      }]
    }, 'child "instruments" fails because ["instruments" at position 0 fails because [child "pollutants" fails because ["pollutants" does not contain 1 required value(s)]]]');
    await metadataSchemaTest({
      name: 'test',
      instruments: [{
        type: 'test-sensor',
        serialNumber: '123',
        pollutants: ['invalid']
      }]
    }, 'child "instruments" fails because ["instruments" at position 0 fails because [child "pollutants" fails because ["pollutants" at position 0 fails because ["0" must be one of [pm25, pm10, co, bc, so2, no2, o3]]]]]');
  });

  it('should update a location', function (done) {
    request({
      method: 'PUT',
      url: `${apiUrl}locations/GB-1/metadata`,
      json: true,
      body: {
        name: 'test',
        instruments: [{
          type: 'test-sensor',
          serialNumber: '123',
          pollutants: ['o3']
        }]
      }
    }, async function (err, response, body) {
      try {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(200);

        // Check the database.
        const res = await db('latest_locations_metadata')
          .select('*')
          .where('locationId', 'GB-1')
          .first();

        // Ensure that all is a string. Mostly because of dates
        const parsed = JSON.parse(JSON.stringify(res));
        expect(body.results).to.deep.equal(parsed);

        done();
      } catch (error) {
        return done(error);
      }
    });
  });
});

function metadataSchemaTest (body, errMsg) {
  return new Promise((resolve, reject) => {
    try {
      request({
        method: 'PUT',
        url: `${apiUrl}locations/GB-1/metadata`,
        json: true,
        body: body
      }, function (err, response, body) {
        expect(err).to.be.null;
        expect(response.statusCode).to.equal(400);

        expect(body.message).to.equal(errMsg);
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}

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
    }, 'child "instruments" fails because ["instruments" at position 0 fails because [child "parameters" fails because ["parameters" is required]]]');
    await metadataSchemaTest({
      name: 'test',
      instruments: [{
        type: 'test-sensor',
        serialNumber: '123',
        parameters: []
      }]
    }, 'child "instruments" fails because ["instruments" at position 0 fails because [child "parameters" fails because ["parameters" does not contain 1 required value(s)]]]');
    await metadataSchemaTest({
      name: 'test',
      instruments: [{
        type: 'test-sensor',
        serialNumber: '123',
        parameters: ['invalid']
      }]
    }, 'child "instruments" fails because ["instruments" at position 0 fails because [child "parameters" fails because ["parameters" at position 0 fails because ["0" must be one of [pm25, pm10, co, bc, so2, no2, o3]]]]]');
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
          parameters: ['o3']
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

import { expect } from 'chai';
import * as utils from '../lib/utils';

describe('utils', function () {
  describe('payloadToKey', function () {
    it('should convert payloads properly', function (done) {
      var payload = {
        date_from: '2015-10-21',
        date_to: '2015-10-22',
        value_from: 20,
        value_to: 21,
        has_geo: true
      };
      var expected =
        'test+date_from=2015-10-21&date_to=2015-10-22&value_from=20&value_to=21&has_geo=true';
      expect(utils.payloadToKey('test', payload)).to.equal(expected);
      done();
    });

    it('should handle no payload well', function (done) {
      var payload = {};
      var expected = 'test';
      expect(utils.payloadToKey('test', payload)).to.equal(expected);
      done();
    });
  });

  describe('queryFromParameters', function () {
    it('should convert payload data correctly', function (done) {
      var payload = {
        date_from: '2015-10-21',
        value_from: 20,
        value_to: 21,
        has_geo: true
      };
      var expected = {
        payload: {},
        operators: [
          {
            column: 'date_utc',
            operator: '>=',
            value: new Date('2015-10-21T00:00:00.000Z')
          }
        ],
        betweens: [
          {
            column: 'value',
            range: [20, 21]
          }
        ],
        nulls: [],
        geo: {},
        notNulls: [{ column: 'coordinates' }]
      };

      expect(utils.queryFromParameters(payload)).to.deep.equal(expected);
      done();
    });

    it('should convert payload dates correctly', function (done) {
      var payload = {
        date_from: '2015-10-21'
      };
      var expected = {
        betweens: [],
        notNulls: [],
        nulls: [],
        geo: {},
        operators: [
          {
            column: 'date_utc',
            operator: '>=',
            value: new Date('2015-10-21')
          }
        ],
        payload: {}
      };
      expect(utils.queryFromParameters(payload)).to.deep.equal(expected);

      payload = {
        date_to: '2015-10-21'
      };
      expected = {
        betweens: [],
        notNulls: [],
        nulls: [],
        geo: {},
        operators: [
          {
            column: 'date_utc',
            operator: '<=',
            value: new Date('2015-10-21')
          }
        ],
        payload: {}
      };
      expect(utils.queryFromParameters(payload)).to.deep.equal(expected);
      done();
    });

    it('should handle geo searches properly', done => {
      const expected = {
        betweens: [],
        notNulls: [],
        nulls: [],
        geo: {},
        operators: [],
        payload: {}
      };

      //
      // Good search
      //
      let payload = {
        coordinates: '41.23,23.03',
        radius: 10
      };
      let exp = Object.assign({}, expected);
      exp.geo = {
        coordinates: { latitude: 41.23, longitude: 23.03 },
        radius: 10
      };

      expect(utils.queryFromParameters(payload)).to.deep.equal(exp);

      //
      // Bad coordinates
      //
      payload = {
        coordinates: '41.23',
        radius: 10
      };
      exp = Object.assign({}, expected);

      expect(utils.queryFromParameters(payload)).to.deep.equal(exp);

      //
      // Bad coordinates
      //
      payload = {
        coordinates: '41.23,',
        radius: 10
      };
      exp = Object.assign({}, expected);

      expect(utils.queryFromParameters(payload)).to.deep.equal(exp);

      //
      // Bad coordinates
      //
      payload = {
        coordinates: 'foo',
        radius: 10
      };
      exp = Object.assign({}, expected);

      expect(utils.queryFromParameters(payload)).to.deep.equal(exp);

      //
      // Bad radius
      //
      payload = {
        coordinates: '41.23',
        radius: 'foo'
      };
      exp = Object.assign({}, expected);

      expect(utils.queryFromParameters(payload)).to.deep.equal(exp);
      done();
    });

    it('should convert ug/m3 to be nice', function (done) {
      var payload = {
        unit: 'ug/m3'
      };
      var expected = {
        betweens: [],
        geo: {},
        notNulls: [],
        nulls: [],
        operators: [],
        payload: {
          unit: 'µg/m³'
        }
      };
      expect(utils.queryFromParameters(payload)).to.deep.equal(expected);

      payload = {
        unit: 'ug/m³'
      };
      expect(utils.queryFromParameters(payload)).to.deep.equal(expected);

      payload = {
        unit: 'µg/m3'
      };
      expect(utils.queryFromParameters(payload)).to.deep.equal(expected);
      done();
    });
  });

  describe('prettyCountryName', function () {
    it('should convert name properly', function (done) {
      expect(utils.prettyCountryName('US')).to.equal('United States');
      expect(utils.prettyCountryName('FOO')).to.equal(undefined);
      done();
    });
  });

  describe('isGeoPayloadOK', function () {
    it('should correctly handle geo payloads', function (done) {
      let payload = {
        coordinates: '40.02,21.23',
        radius: 10
      };
      expect(utils.isGeoPayloadOK(payload)).to.be.true;

      payload = {
        coordinates: '40.02,21.23',
        nearest: 10
      };
      expect(utils.isGeoPayloadOK(payload)).to.be.true;

      payload = {
        coordinates: '40.02,21.23',
        nearest: 'foo'
      };
      expect(utils.isGeoPayloadOK(payload)).to.be.false;

      payload = {
        coordinates: '40.02,21.23'
      };
      expect(utils.isGeoPayloadOK(payload)).to.be.true;

      payload = {
        coordinates: '40.02,',
        radius: 10
      };
      expect(utils.isGeoPayloadOK(payload)).to.be.false;

      payload = {
        coordinates: 'foo',
        radius: 10
      };
      expect(utils.isGeoPayloadOK(payload)).to.be.false;

      payload = {
        coordinates: '40.02,21.23',
        radius: 'foo'
      };
      expect(utils.isGeoPayloadOK(payload)).to.be.false;
      done();
    });
  });
});

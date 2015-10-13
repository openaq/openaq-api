/* global describe, it */
'use strict';

var expect = require('chai').expect;
var utils = require('../../lib/utils');

describe('Testing helper functions', function () {
  describe('verifyDataFormat', function () {
    it('should fail with nothing', function (done) {
      expect(utils.verifyDataFormat()).to.be.false;
      expect(utils.verifyDataFormat({})).to.be.false;
      done();
    });

    it('should fail with bad name', function (done) {
      var data = {
        name: 234
      };
      expect(utils.verifyDataFormat(data)).to.be.false;
      done();
    });

    it('should fail with bad measurements', function (done) {
      var data = {
        name: 'test',
        measurements: [
          {
            parameter: 324,
            unit: 234,
            value: 'asd',
            date: new Date()
          },
          {
            parameter: 'pm25',
            unit: 'ppb',
            value: 234,
            date: new Date()
          },
          {
            parameter: 'pm25',
            unit: 'ppm',
            value: 234,
            coordinates: {
              latitude: 43
            },
            date: new Date()
          },
          {
            parameter: 'pm25',
            unit: 'µg/m3',
            value: 20,
            date: new Date()
          }
        ]
      };
      expect(utils.pruneMeasurements(data.measurements).length).to.equal(1);
      done();
    });

    it('should pass with good data', function (done) {
      var data = {
        name: 'test',
        measurements: [
          {
            parameter: 'test',
            unit: 'test',
            value: 34,
            date: new Date()
          },
          {
            parameter: 'test',
            unit: 'test',
            value: 34,
            date: new Date()
          }
        ]
      };
      expect(utils.verifyDataFormat(data)).to.be.true;
      done();
    });
  });
});

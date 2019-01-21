/* global describe, it, beforeEach, afterEach */
'use strict';

const sinon = require('sinon');
const expect = require('chai').expect;

process.env.MAX_RUNNING_QUERIES = 2;
const canRunQuery = require('../../lib/canRunQuery');

const runningQueryObject = { Status: { State: 'RUNNING' } };
const getQueryExecutionIdsStub = sinon.stub(canRunQuery, 'getQueryExecutionIds');
const batchGetQueryExecutionStub = sinon.stub(canRunQuery, 'batchGetQueryExecution');

describe('canRunQuery', () => {
  beforeEach(() => {
    getQueryExecutionIdsStub.resolves({
      NextToken: undefined,
      QueryExecutionIds: [ ]
    });

    batchGetQueryExecutionStub.resolves({
      QueryExecutions: Array(1).fill(runningQueryObject)
    });
  });

  afterEach(sinon.reset);

  describe('just enough queries running', () => {
    it('returns true', (done) => {
      canRunQuery.canRunQuery()
        .then((res) => {
          expect(res).to.equal(true);
          done();
        })
        .catch(done);
    });
  });

  describe('more than enough queries running', () => {
    it('returns false when the first page has more than the max', (done) => {
      batchGetQueryExecutionStub.reset();
      batchGetQueryExecutionStub.resolves({
        QueryExecutions: Array(3).fill(runningQueryObject)
      });

      canRunQuery.canRunQuery()
        .then((res) => {
          expect(res).to.equal(false);
          done();
        })
        .catch(done);
    });

    it('returns false when subsequent pages have more than the max in aggregate', (done) => {
      getQueryExecutionIdsStub.reset();
      getQueryExecutionIdsStub.resolves({
        NextToken: 1,
        QueryExecutionIds: [ ]
      });

      canRunQuery.canRunQuery()
        .then((res) => {
          expect(res).to.equal(false);
          done();
        })
        .catch(done);
    });
  });
});

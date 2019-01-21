'use strict';

const AWS = require('aws-sdk');
const athena = new AWS.Athena({region: 'us-east-1'});

let maxRunningQueries = process.env.MAX_RUNNING_QUERIES || 7;

const getQueryExecutionIds = function (nextToken) {
  const params = {
    MaxResults: 50, // The max
    NextToken: nextToken
  };

  return new Promise((resolve, reject) => {
    athena.listQueryExecutions(params, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
};
module.exports.getQueryExecutionIds = getQueryExecutionIds;

function batchGetQueryExecution (QueryExecutionIds) {
  return new Promise((resolve, reject) => {
    athena.batchGetQueryExecution({QueryExecutionIds}, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}
module.exports.batchGetQueryExecution = batchGetQueryExecution;

function checkRunningQueries (nextToken, numRunningQueries) {
  return module.exports.getQueryExecutionIds(nextToken)
    .then((queryExecutionResponse) => {
      nextToken = queryExecutionResponse.NextToken;
      const { QueryExecutionIds } = queryExecutionResponse;
      return module.exports.batchGetQueryExecution(QueryExecutionIds);
    })
    .then((batchQueryResponse) => {
      const runningQueries = batchQueryResponse.QueryExecutions.filter((queryExecution) => queryExecution.Status.State === 'RUNNING');
      numRunningQueries += runningQueries.length;
      if (nextToken !== undefined && numRunningQueries < maxRunningQueries) {
        return checkRunningQueries(nextToken, numRunningQueries);
      } else {
        return numRunningQueries;
      }
    });
}

function canRunQuery () {
  let nextToken = null;

  return new Promise((resolve, reject) => {
    checkRunningQueries(nextToken, 0)
      .then((numRunningQueries) => {
        resolve(numRunningQueries < maxRunningQueries);
      })
      .catch(reject);
  });
}
module.exports.canRunQuery = canRunQuery;

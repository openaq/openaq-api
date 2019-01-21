'use strict';

const AWS = require('aws-sdk');
const athena = new AWS.Athena({region: 'us-east-1'});

let maxRunningQueries = process.env.MAX_RUNNING_QUERIES || 7;

const getQueryExecutionIds = async function (nextToken) {
  const params = {
    MaxResults: 50, // The max
    NextToken: nextToken
  };

  return athena.listQueryExecutions(params).promise();
};
module.exports.getQueryExecutionIds = getQueryExecutionIds;

async function batchGetQueryExecution (QueryExecutionIds) {
  return athena.batchGetQueryExecution({QueryExecutionIds}).promise();
}
module.exports.batchGetQueryExecution = batchGetQueryExecution;

async function canRunQuery () {
  let numRunningQueries = 0;
  let NextToken = null;

  while (NextToken !== undefined && numRunningQueries < maxRunningQueries) {
    let queryExecutionResponse = await module.exports.getQueryExecutionIds(NextToken);
    NextToken = queryExecutionResponse.NextToken;
    const { QueryExecutionIds } = queryExecutionResponse;

    // fetch
    const batchQueryResponse = await module.exports.batchGetQueryExecution(QueryExecutionIds);
    const runningQueries = batchQueryResponse.QueryExecutions.filter((queryExecution) => queryExecution.Status.State === 'RUNNING');
    numRunningQueries += runningQueries.length;
  }

  // if the number of runninq queries is less than or equal to the max, we can run another query
  return numRunningQueries < maxRunningQueries;
}
module.exports.canRunQuery = canRunQuery;

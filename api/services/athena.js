'use strict';

import owl from 'little-owl';
import pify from 'pify';
import { doWhilst } from 'async';

const athenaConfig = {
  accessKeyId: process.env.ATHENA_ACCESS_KEY_ID,
  secretAccessKey: process.env.ATHENA_SECRET_ACCESS_KEY,
  outputBucket: process.env.ATHENA_OUTPUT_BUCKET
};

class AthenaClient {
  constructor (opts) {
    const o = owl(opts);
    this.submitQuery = pify(o.submitQuery.bind(o));
    this.getQueryResults = pify(o.getQueryResults.bind(o));
  }

  _getAllResults (queryId) {
    var athenaClient = this;
    return new Promise((resolve, reject) => {
      let nextToken;
      let rows = [];
      let runNumber = 1;
      doWhilst(
        function (callback) {
          let opts = {};
          if (nextToken !== undefined) {
            opts.nextToken = nextToken;
          }

          athenaClient.getQueryResults(queryId, opts)
            .then(data => {
              data.results.forEach(row => rows.push(row));
              nextToken = data.nextToken;
              runNumber++;
              callback(null);
            })
            .catch(err => callback(err));
        },
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(athenaClient._dataMapping(rows));
          }
        }
      );
    });
  }

  query (sql) {
    var active = true;
    var client = this;
    return {
      // Provide a thenable to chain the next function
      then: fn => {
        return client.submitQuery(sql)
          .then(queryId => {
            active = !active;
            return queryId;
          })
          .then(client._getAllResults.bind(client))
          .then(fn)
          .catch(function (err) {
            throw new Error(err);
          });
      },

      // Provide an active query that can check the active
      // variable. The active query returns a thenable interface
      activeQuery: () => {
        return {
          then: fn => {
            let results = active ? ['query'] : [];
            return Promise.resolve(results).then(fn);
          }
        };
      }
    };
  }

  /**
   * Map the output of getAllResults to an array
   * of dicts
   *
   * @param {Array} results - the output of getAllResults, where the first row is an array containing the column names and all the other rows are the data
   *
   */
  _dataMapping (results) {
    let header = results.shift();
    return results.map(row => {
      let obj = {};

      header.forEach((column, idx) => {
        obj[column] = row[idx];
      });

      return obj;
    });
  }
}

const client = new AthenaClient(athenaConfig);
export default client;

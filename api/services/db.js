'use strict';

var MongoClient = require('mongodb').MongoClient;

exports.db = undefined;

exports.connect = function (dbURL, cb) {
  MongoClient.connect(dbURL, function (err, db) {
    if (err) {
      return cb(err);
    }

    exports.db = db;
    if (cb && typeof cb === 'function') {
      return cb(null);
    }
  });
};

exports.drop = function (cb) {
  exports.db.dropDatabase(cb);
};

exports.close = function () {
  exports.db.close();
};

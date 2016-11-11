'use strict';

var Boom = require('boom');
import { db } from '../services/db';
import AWS from 'aws-sdk';
const s3 = new AWS.S3();
import { createCipher } from 'crypto';
import { log } from '../services/logger';

/**
* Generates presigned URL for S3 put
*
* @param {Object} query - Payload contains query paramters and their values
* @param {recordsCallback} cb - The callback that returns the url
*/
module.exports.getURL = function (query, cb) {
  // Make sure we have a token and a filename
  if (!query.token) {
    return cb(Boom.badRequest('missing token'));
  } else if (!query.filename) {
    return cb(Boom.badRequest('missing filename'));
  }

  // Check DB for token, encrypting it first
  const cipher = createCipher('aes-256-ctr', process.env.UPLOADS_ENCRYPTION_KEY || 'not_secure');
  let crypted = cipher.update(query.token, 'utf8', 'hex');
  crypted += cipher.final('hex');
  const tokenQuery = db
                      .count('id')
                      .where('token', crypted)
                      .from('upload_tokens');
  tokenQuery.then((count) => {
    if (Number(count[0].count) === 0) {
      return cb(Boom.unauthorized());
    }

    // If we're here, we're authorized so generate presigned URL for S3 PUT
    const params = {Bucket: process.env.S3_UPLOAD_BUCKET, Key: query.filename};
    s3.getSignedUrl('putObject', params, (err, url) => {
      if (err) {
        return cb(Boom.badImplementation());
      }

      return cb(null, {presignedURL: url});
    });
  }).catch((err) => {
    log(['error'], err);
    return cb(Boom.badImplementation());
  });
};

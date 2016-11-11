'use strict';

var crypto = require('crypto');

var encrypt = function (text) {
  var cipher = crypto.createCipher('aes-256-ctr', process.env.UPLOADS_ENCRYPTION_KEY);
  var crypted = cipher.update(text, 'utf8', 'hex');
  crypted += cipher.final('hex');
  return crypted;
};

console.log('Encrypting string: ' + process.argv[2]);
console.log(encrypt(process.argv[2]));

'use strict';

const BearerStrategy = require('passport-http-bearer').Strategy;
const restify = require('restify');
const assert = require('assert-plus');

function createStrategy(options) {
  assert.string(options.host, 'host not provided');
  assert.string(options.path, 'introspection path not provided');
  assert.string(options.username, 'username not provided');
  assert.string(options.password, 'password not provided');

  const client = restify.createJsonClient({
    url: options.host,
    connectTimeout: options.connectionTimeout,
    requestTimeout: options.requestTimeout,
    // TODO(uk): make this configurable
    retry: false,
    // TODO(uk): this needs to be removed once the certs are valid
    rejectUnauthorized: false
  });

  client.basicAuth(options.username, options.password);

  return new BearerStrategy(function verifyToken(accessToken, done) {
    const data = {token: accessToken};

    client.post(options.path, data, function (err, req, res, token) {
      // ensure we have a token and its active
      if (!token || !token.active) {
        return done(err, false);
      }

      return done(err, {
        userId: token.user_id,
        clientId: token.client_id
      }, token);

    });
  });
}

module.exports = createStrategy;

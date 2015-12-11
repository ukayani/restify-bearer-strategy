'use strict';
const expect = require('chai').expect;
const request = require('supertest-as-promised');
const restify = require('restify');
const passport = require('passport');
const nock = require('nock');
const strategy = require('../lib/auth.strategy');
const authMiddlewareBuilder = require('../lib/authentication.middleware');

let HTTP = {
  OPERATION_OK: 200,
  UNAUTHORIZED: 401,
  RESOURCE_NOT_FOUND: 404
};

const options = {
  host: 'http://auth.com',
  path: '/introspect',
  username: 'client',
  password: 'bob'
};
const strategyName = 'default';

// register auth strategy

function verifyFailure(server, token, nockScope, httpcode) {
  // hit it
  return request(server)
    .get('/secure')
    .set('Authorization', `Bearer ${token}`)
    .expect(httpcode)
    .then(function () {
      expect(nockScope.isDone()).to.be.true;
    });
}

function mockIntrospect(token) {
  // mock auth endpoint
  return nock(options.host)
    .replyContentLength()
    .post(options.path, {token})
    .basicAuth({
      user: options.username,
      pass: options.password
    });
}

function createServerWithAuthMiddleware(middlewareOptions) {
  // setup restify
  let server = restify.createServer({noAudit: true});
  // only show fatal error logs
  server.log.level('fatal');

  const authMiddleware = authMiddlewareBuilder(middlewareOptions);
  server.get('/secure', authMiddleware, function (req, res, next) {
    res.send(HTTP.OPERATION_OK, {message: 'success', scopes: req.authInfo.scopes});
    next();
  });

  return server;
}

describe('Bearer token strategy with all options specified', function () {

  passport.use(strategyName, strategy(options));
  const scopeSeparator = ' ';
  const server = createServerWithAuthMiddleware({
    strategyName,
    scopeSeparator,
    passport: {session: false}
  });

  it('valid token', function () {

    const token = 'blahblah';
    const validResponse = {
      active: true,
      user_id: 'bob',
      client_id: 'alice',
      token_type: 'Bearer'
    };
    // mock auth endpoint
    let scope = mockIntrospect(token)
      .reply(HTTP.OPERATION_OK, validResponse);

    // hit it
    return request(server)
      .get('/secure')
      .set('Authorization', `Bearer ${token}`)
      .expect(HTTP.OPERATION_OK)
      .then(function (res) {
        expect(res.body.message).to.be.equal('success');
        expect(scope.isDone()).to.be.true;
      });

  });

  it('invalid token', function () {

    const token = 'invalid';
    const invalidResponse = {active: false};
    // mock auth endpoint
    let scope = mockIntrospect(token)
      .reply(HTTP.RESOURCE_NOT_FOUND, invalidResponse);

    return verifyFailure(server, token, scope, HTTP.UNAUTHORIZED);

  });

  it('invalid credentials', function () {

    const token = 'valid';

    // mock auth endpoint
    let scope = mockIntrospect(token)
      .reply(HTTP.UNAUTHORIZED, 'Unauthorized');

    // hit it
    return verifyFailure(server, token, scope, HTTP.UNAUTHORIZED);

  });

  it('no token provided in request', function () {
    // hit it without passing bearer token
    return request(server)
      .get('/secure')
      .expect(HTTP.UNAUTHORIZED);
  });

  it('should split scopes and provide them in the restify request', function () {
    const token = 'blahblah';
    const validResponse = {
      active: true,
      user_id: 'bob',
      client_id: 'alice',
      token_type: 'Bearer',
      scope: 'scope1' + scopeSeparator + 'scope2'
    };
    // mock auth endpoint
    let scope = mockIntrospect(token)
      .reply(HTTP.OPERATION_OK, validResponse);

    // hit it
    return request(server)
      .get('/secure')
      .set('Authorization', `Bearer ${token}`)
      .expect(HTTP.OPERATION_OK)
      .then(function (res) {
        expect(res.body.message).to.be.equal('success');
        expect(res.body.scopes).to.be.deep.equal(['scope1', 'scope2']);
        expect(scope.isDone()).to.be.true;
      });
  });

});

describe('Bearer token strategy with default options', function() {

  passport.use('default', strategy(options));
  const server = createServerWithAuthMiddleware({});

  it('valid token', function () {
    const token = 'blahblah';
    const validResponse = {
      active: true,
      user_id: 'bob',
      client_id: 'alice',
      token_type: 'Bearer'
    };
    // mock auth endpoint
    let scope = mockIntrospect(token)
      .reply(HTTP.OPERATION_OK, validResponse);

    // hit it
    return request(server)
      .get('/secure')
      .set('Authorization', `Bearer ${token}`)
      .expect(HTTP.OPERATION_OK)
      .then(function (res) {
        expect(res.body.message).to.be.equal('success');
        expect(scope.isDone()).to.be.true;
      });
  });
});

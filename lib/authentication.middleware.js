'use strict';
const errors = require('restify-errors');
const passport = require('passport');
const R = require('ramda');

/**
 * Creates a restify middleware function that does bearer token authentication using a provided strategy name
 * On successful authentication, the restify request object will be populated with a `authInfo` and `userInfo` property
 * with `authInfo` containing an array of granted scopes as well as other information pertaining to the token
 * `userInfo` will contain information about the user associated with the token
 * Will throw a restify error if authentication fails
 *
 * @param options
 *             .strategyName - Name of passport strategy to use (must be registered in passport)
 *             .scopeSeparator - The delimiter used to split scopes (defaults to space)
 *             .passport - an object to be passed into passport.authenticate for further customization
 * @param req - restify request
 * @param res - restify response
 * @param next - restify next handler
 */
const middleware = R.curry(function (options, req, res, next) {

  const strategyName = options.strategyName || 'default';
  const scopeSeparator = options.scopeSeparator || ' ';
  const passportOptions = options.passport || {session: false};

  passport.authenticate(strategyName, passportOptions, function (err, user, info) {
    if (!user) {
      err = err || new Error('Token not provided in request');
    }

    if (err) {
      req.log.error(err, 'Authentication Error');
      // TODO(ukayani || cfernandes): we should probably differentiate between badrequest (from passport) and bad token
      // as per the RFC https://tools.ietf.org/html/rfc6750, returning a 401 for failed introspection
      const invalidCredentialError = new errors.InvalidCredentialsError('The access token expired');
      return next(invalidCredentialError);
    }

    // Allow the subsequent handlers to access OAuth information
    req.authInfo = info;
    req.userInfo = user;
    req.authInfo.scopes = R.split(scopeSeparator, info.scope || '');

    return next();

  })(req, res, next);
});

module.exports = middleware;

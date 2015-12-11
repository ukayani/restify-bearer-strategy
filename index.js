'use strict';

const middleware = require('./lib/authentication.middleware');
const strategy = require('./lib/auth.strategy');

module.exports = {
  middleware,
  strategy
};

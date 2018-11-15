/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var _ = require('lodash');

_.forEach(['silly', 'debug', 'verbose', 'info', 'warn', 'error'], function (name) {
    exports[name] = _.noop;
});

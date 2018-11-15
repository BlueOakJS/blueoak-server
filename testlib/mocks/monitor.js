/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var _ = require('lodash');

_.forEach(['increment', 'decrement', 'set', 'unique', 'gauge', 'histogram', 'timing', 'enabled'], function (name) {
    exports[name] = _.noop;
});

exports.enabled = _.noop;
exports.express = _.noop;
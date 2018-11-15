/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */

var util = require('util');
var winston = require('winston');
var initOptions = null;

var Transport = function(options) {
    initOptions = options;
};
util.inherits(Transport, winston.Transport);

// eslint-disable-next-line lodash/prefer-noop
Transport.prototype.log = function() {
    
};

exports.foo = {
    bar: Transport
};

exports.getOptions = function() {
    return initOptions;
};
/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var initialized = false;

exports.init = function(callback) {
    initialized = true;
    callback();
};

exports.isInitialized = function() {
    return initialized;
};
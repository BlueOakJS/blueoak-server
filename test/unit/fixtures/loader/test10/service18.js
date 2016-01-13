/*
 * Copyright 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var initialized = false;

exports.init = function() {
    initialized = true;
};

exports.isInitialized = function() {
    return initialized;
};
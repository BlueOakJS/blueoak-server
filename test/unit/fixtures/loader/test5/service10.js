/*
 * Copyright 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
//uses async init to set initialized to true
var initialized = false;

exports.init = function(service11, callback) {
    initialized = true;
    callback();
};

exports.isInitialized = function() {
    return initialized;
};
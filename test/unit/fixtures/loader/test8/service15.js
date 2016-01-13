/*
 * Copyright 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var initialized = false;

exports.init = function(serviceOne) {
    initialized = serviceOne.isInitialized();
};

exports.isInitialized = function() {
    return initialized;
};
/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var initialized = false;

exports.init = function(serviceLoader) {
    initialized = serviceLoader !== null;
};


exports.isInitialized = function() {
    return initialized;
};
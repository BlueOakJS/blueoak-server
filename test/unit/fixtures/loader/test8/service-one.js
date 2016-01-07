/* Copyright © 2015 PointSource, LLC. All rights reserved. */
var initialized = false;

exports.init = function(serviceLoader) {
    initialized = serviceLoader !== null;
};


exports.isInitialized = function() {
    return initialized;
};
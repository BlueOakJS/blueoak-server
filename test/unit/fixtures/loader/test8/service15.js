/* Copyright © 2015 PointSource, LLC. All rights reserved. */
var initialized = false;

exports.init = function(serviceOne) {
    initialized = serviceOne.isInitialized();
};

exports.isInitialized = function() {
    return initialized;
};
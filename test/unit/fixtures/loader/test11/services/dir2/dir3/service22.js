/* Copyright © 2015 PointSource, LLC. All rights reserved. */
var initialized = false;

exports.init = function(callback) {
    initialized = true;
    callback();
};

exports.isInitialized = function() {
    return initialized;
};
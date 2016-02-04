/* Copyright © 2015 PointSource, LLC. All rights reserved. */
//uses async init to set initialized to true
var initialized = false;

exports.init = function(blah, callback) {
    initialized = blah;
    callback();
};

exports.isInitialized = function() {
    return initialized;
};
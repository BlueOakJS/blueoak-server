/* Copyright © 2015 PointSource, LLC. All rights reserved. */
//uses async init to set initialized to true
var initialized = false;

exports.init = function(service15) {
    initialized = true;
};

exports.isInitialized = function() {
    return initialized;
};
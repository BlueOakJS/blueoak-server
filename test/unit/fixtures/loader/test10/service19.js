/* Copyright © 2015 PointSource, LLC. All rights reserved. */
var initialized = false;

exports.init = function() {
    initialized = true;
};

exports.isInitialized = function() {
    return initialized;
};
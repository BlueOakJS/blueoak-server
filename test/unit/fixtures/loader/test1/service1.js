/* Copyright © 2015 PointSource, LLC. All rights reserved. */
//uses sync init to set initialized to true
var initialized = false;

exports.init = function() {
    initialized = true;
}

exports.isInitialized = function() {
    return initialized;
}
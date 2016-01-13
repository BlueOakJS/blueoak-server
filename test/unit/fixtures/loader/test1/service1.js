/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
//uses sync init to set initialized to true
var initialized = false;

exports.init = function() {
    initialized = true;
};

exports.isInitialized = function() {
    return initialized;
};
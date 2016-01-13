/*
 * Copyright 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
//synchronous
var initialized = false;

exports.init = function() {
    throw new Error('crap, an error occured');
};

exports.isInitialized = function() {
    return initialized;
};
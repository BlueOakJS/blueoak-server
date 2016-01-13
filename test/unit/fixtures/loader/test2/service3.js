/*
 * Copyright 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
//asynchronous
var initialized = false;

exports.init = function(callback) {

    //simulate an error
    return callback(new Error('crap!'));
};

exports.isInitialized = function() {
    return initialized;
};
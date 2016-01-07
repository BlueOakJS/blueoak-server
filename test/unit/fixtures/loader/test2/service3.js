/* Copyright © 2015 PointSource, LLC. All rights reserved. */
//asynchronous
var initialized = false;

exports.init = function(callback) {

    //simulate an error
    return callback(new Error('crap!'));
};

exports.isInitialized = function() {
    return initialized;
};
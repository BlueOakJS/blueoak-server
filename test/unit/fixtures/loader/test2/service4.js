/* Copyright © 2015 PointSource, LLC. All rights reserved. */
//synchronous
var initialized = false;

exports.init = function() {
    throw new Error('crap, an error occured');
}

exports.isInitialized = function() {
    return initialized;
}
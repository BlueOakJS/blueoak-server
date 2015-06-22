/* Copyright © 2015 PointSource, LLC. All rights reserved. */
var initialized = false;
var consumers = [];

exports.init = function(callback) {
    initialized = true;
    callback();
}

exports.isInitialized = function() {
    return initialized;
}

exports.add = function(name) {
    consumers.push(name);
}

exports.get = function() {
    return consumers;
}

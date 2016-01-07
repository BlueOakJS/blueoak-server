/* Copyright © 2015 PointSource, LLC. All rights reserved. */
//uses async init to set initialized to true
var initialized = false;

var consumers = [];

exports.init = function(callback) {
    initialized = true;
    callback();
};

exports.add = function(name) {
    consumers.push(name);
};

exports.get = function() {
    return consumers;
};

exports.isInitialized = function() {
    return initialized;
};
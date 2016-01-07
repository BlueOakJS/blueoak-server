/* Copyright © 2015 PointSource, LLC. All rights reserved. */
//uses async init to set initialized to true
var initialized = false;

exports.init = function(service15, serviceLoader) {
    initialized = serviceLoader.get('service14').isInitialized() && service15.isInitialized();
};

exports.getDependencies = function(serviceLoader) {
    return ['service14'];
};

exports.isInitialized = function() {
    return initialized;
};
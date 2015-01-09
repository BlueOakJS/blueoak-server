//uses async init to set initialized to true
var initialized = false;

exports.init = function(service10, callback) {
    initialized = true;
    callback();
}

exports.isInitialized = function() {
    return initialized;
}
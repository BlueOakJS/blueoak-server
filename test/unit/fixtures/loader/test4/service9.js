//uses async init to set initialized to true
var initialized = false;

exports.init = function(callback) {
    initialized = true;
    callback();
}

exports.isInitialized = function() {
    return initialized;
}
//uses async init to set initialized to true
var initialized = false;

exports.init = function(service5, callback) {
    if (service5.isInitialized()) {
        initialized = true;
    }
    callback();
}

exports.isInitialized = function() {
    return initialized;
}
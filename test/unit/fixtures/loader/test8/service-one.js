var initialized = false;

exports.init = function(serviceLoader) {
    initialized = serviceLoader !== null;
}


exports.isInitialized = function() {
    return initialized;
}
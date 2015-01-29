var initialized = false;

exports.init = function(serviceOne) {
    initialized = serviceOne.isInitialized();
}

exports.isInitialized = function() {
    return initialized;
}
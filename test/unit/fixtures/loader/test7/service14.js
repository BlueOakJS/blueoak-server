//uses async init to set initialized to true
var initialized = false;

exports.init = function(service13) {
    initialized = service13.isInitialized();
}

exports.isInitialized = function() {
    return initialized;
}
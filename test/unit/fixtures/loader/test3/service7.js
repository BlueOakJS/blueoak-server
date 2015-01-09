//uses async init to set initialized to true
var initialized = false;

exports.init = function(service6) {

    if (service6.isInitialized()) {
        initialized = true;
    }
}

exports.isInitialized = function() {
    return initialized;
}
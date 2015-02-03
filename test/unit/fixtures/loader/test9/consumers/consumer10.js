var initialized = false;

exports.init = function(blah, callback) {
    initialized = blah.isInitialized();
    callback();
}

exports.isInitialized = function() {
    return initialized;
}
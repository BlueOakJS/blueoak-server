//Some utilities to help with testing services

var di = require('../../lib/di'),
    _ = require('lodash');

//creates a mock config service
function getConfigService(cfg) {
    return {
        get: function(id) {
            return cfg[id] || {};
        }
    };
}

//create a mock logger
var logger = {};

['silly', 'debug', 'verbose', 'info', 'warn', 'error'].forEach(function(method) {
    logger[method] = function() {}; //no-op
});

//create a mock monitor
var monitor = {};
['increment', 'decrement', 'set', 'unique', 'gauge', 'histogram', 'timing'].forEach(function(method) {
    monitor[method] = function() {}; //no-op
});

//This will simulate the normal dependency injection
//pass in a service module, a set of config to inject into the config service,
//and an optional mapping of additional injections
//config, logger, and monitor are handled automatically, anything else needs to be included in the injections map
//callback is optional as well
exports.initService = function(module, config, injections, callback) {
    //injections is optional
    if (!injections) {
        injections = {};
    }

    if (_.isFunction(injections)) {
        callback = injections;
        injections = {};
    }

    if (!callback) {
        callback = function() {};
    }

    injections.config = getConfigService(config);
    injections.logger = logger;
    injections.monitor = monitor;

    var args = [];
    di.getParamNames(module.init).forEach(function(name) {
        args.push(injections[name]);
    });

    if (di.hasCallback(module.init)) {
        args.push(callback);
        module.init.apply(null, args);
    } else {
        module.init.apply(null, args);
        callback();
    }

}
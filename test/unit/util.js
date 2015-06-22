/* Copyright © 2015 PointSource, LLC. All rights reserved. */
//Some utilities to help with testing services

var di = require('../../lib/di'),
    _ = require('lodash')
    sinon = require('sinon');

//creates a mock config service
function getConfigService(cfg) {
    return {
        get: function(id) {
            return cfg[id] || {};
        }
    };
}

//create a mock logger
var logger = require('./mocks/logger');

//create a mock monitor
var monitor = require('./mocks/monitor');

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


/* This is a new init method to replace initService
 * mod: the module to init
 * serviceMap (optional) - a map of name to module
 * serviceCallback - a callback once the service stubs have been loaded to give
 *   an opportunity to stub out the methods calls
 * callback - a callback once init has completed
 */
exports.init = function(mod, serviceMap, serviceCallback, callback) {
    if (!callback) { //no opts
        callback = serviceCallback;
        serviceCallback = serviceMap;
        serviceMap = {};
    }
    
    global.services = {
      get: function(name) {
          console.log("Get", name)
          return serviceMap[name];
      }  
    };
    
    var paramNames = di.getParamNames(mod.init);
    var mockParams = [];
    paramNames.forEach(function(paramName) {
        if (!serviceMap[paramName]) {
            
            //since it's possible that this has already been loaded once and
            //has stubbed out methods, delete it from the cache
            var modPath = require.resolve('./mocks/' + paramName);
            delete require.cache[modPath];
            
            serviceMap[paramName] = require('./mocks/' + paramName);
        }
        mockParams.push(serviceMap[paramName]);
    });
    serviceCallback(serviceMap);
    if (di.hasCallback(mod.init)) {
        mockParams.push(callback);
        mod.init.apply(global, mockParams);
    } else {
        var thrownError = null;
        try {
            mod.init.apply(global, mockParams);
        } catch (err) {
            thrownError = err;
        }
        callback(thrownError);
    }
}

exports.restore = function() {
    
}
/* Copyright © 2015 PointSource, LLC. All rights reserved. */
//Some utilities to help with testing services

var di = require('../lib/di'),
    _ = require('lodash'),
    fs = require('fs'),
    stripJsonComments = require('strip-json-comments'),
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

};

/*
 * This method lets you include unmodified BO services into your tests. One use case is
 * when testing your own service that depends on BO services, but the particular method
 * you want to test does not.  Rather than replicating mocked/stubbed functionality that already
 * exists in the core services, you can just inject the core services themselves so 
 * init() and logic/calls within init() doesn't break.
 *
 * @param {Array|String} modules - An single name of a module or an array of module names
 * @param {String|Object} config - A configuration file path or required()'d object.  Any necessary 
                                   config properties that aren't present will be included with 
                                   BO defaults.
 * @param {function} callback - Called after all modules are required and init()'d. An object with 
 *                              the mapping, `{ <module_name>: <module>, ... }` is returned.
 */
exports.injectCore = function (modules, config, callback) {
  var coreModules = fs.readdirSync(__dirname + '/../services/'),
      servicePattern = /^[a-z]+(.js)$/i,
      initializedModules = {},
      initializedCount = 0,
      temp;

  if(typeof config === 'string') {
    config = loadJson(config);
  }

  config = augmentConfigWithDefaults(config);

  for(var i = 0; i < coreModules.length; i++) {
    if(!servicePattern.test(coreModules[i])) {
      coreModules.splice(i, 1);  
    }

    coreModules[i] = coreModules[i].split('.')[0];
  }

  if(!(modules instanceof Array)) {
    modules = [modules]; 
  }

  for(var i = 0; i < modules.length; i++) {
    temp = {};

    if(coreModules.indexOf(modules[i]) === -1) {
      throw new Error('Given module name is not a core service');
    }

    initializedModules[modules[i]] = require('../services/' + modules[i]);

    this.initService(initializedModules[modules[i]], config, function (error) {
      if(error) {
        throw new Error('Unable to inject core service');
      }

      initializedCount++;
      if(initializedCount === modules.length) {
        callback(initializedModules);
      }
    });
  }
};

/*
 * Load defaults.json from blueoak-server to merge with a given config to ensure core services
 * function as intended.
 */
function augmentConfigWithDefaults (config) {
  var defaultConfig = loadJson(__dirname + '/../defaults.json');

  return populateMissingProperties(defaultConfig, config);
}

/*
 * Recursively populate missing properties and values in the given injectCore() configuration
 */
function populateMissingProperties (defaultConfig, config) {
  for(var property in defaultConfig) {
    if(typeof defaultConfig[property] === 'object' && !(defaultConfig[property] instanceof Array)) {
      if(!config[property]) {
        config[property] = {};
      }

      populateMissingProperties(defaultConfig[property], config[property]);
    } else {
      if(!config[property]) {
        config[property] = defaultConfig[property];
      }
    }
  }

  return config;
}

/*
 * Return an object from a JSON file containing comments
 */
function loadJson (path) {
  var json = fs.readFileSync(path, 'utf-8');  
  json = stripJsonComments(json);
  json = JSON.parse(json);

  return json;
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
          console.log("Get", name);
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
};

exports.restore = function() {
};

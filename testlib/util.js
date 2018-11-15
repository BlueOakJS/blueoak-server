/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
//Some utilities to help with testing services

var di = require('../lib/di'),
    _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    importFresh = require('import-fresh'),
    stripJsonComments = require('strip-json-comments');

//creates a mock config service
function getConfigService(configObject) {
    return {
        get: function(id) {
            return configObject[id] || {};
        }
    };
}
exports.createConfigService = getConfigService;

//create a mock logger services, loading them using import-fresh in case they ever need to be reloaded
var logger = importFresh('./mocks/logger'),
    monitor = importFresh('./mocks/monitor');

//This will simulate the normal dependency injection
//pass in a service module, a set of config to inject into the config service,
//and an optional mapping of additional injections
//config, logger, and monitor are handled automatically, anything else needs to be included in the injections map
//callback is optional as well
exports.initService = function(module, config, injections, callback) {
    // injections and callback are optional ...
    if (_.isFunction(injections)) {
        callback = injections;
        injections = {};
    } else {
        if (!injections) {
            injections = {};
        }
        if (!callback) {
            callback = _.noop;
        }
    }
    
    injections.config = getConfigService(config);
    injections.logger = logger;
    injections.monitor = monitor;

    var args = _.map(di.getParamNames(module.init), function(name) {
        return injections[normalizeServiceName(name)];
    });

    if (di.hasCallback(module.init)) {
        args.push(callback);
        module.init.apply(null, args);
    } else {
        module.init.apply(null, args);
        return callback();
    }

};

//Copied from loader.js
function normalizeServiceName(str) {
    if (/^_.+_$/.test(str)) {
        str = str.slice(1, str.length);
        str = str.slice(0, str.length - 1);
    }

    // eslint-disable-next-line lodash/prefer-lodash-method
    return str.replace(/([A-Z])/g, '-$1').replace(/[-_\s]+/g, '-').toLowerCase();
}


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
    var coreModules = fs.readdirSync(path.join(__dirname, '/../services/')),
        servicePattern = /^[a-z]+(.js)$/i,
        initializedModules = {},
        initializedCount = 0;

    if (_.isString(config)) {
        config = loadJson(config);
    }

    config = augmentConfigWithDefaults(config);

    for (var i = 0; i < coreModules.length; i++) {
        if (!servicePattern.test(coreModules[i])) {
            coreModules.splice(i, 1);
        }

        coreModules[i] = _.split(coreModules[i], '.')[0];
    }

    if (!_.isArray(modules)) {
        modules = [modules];
    }

    for (var j = 0; j < modules.length; j++) {

        if (!_.includes(coreModules, modules[j])) {
            throw new Error('Given module name is not a core service');
        }

        // in testing we might get multiple calls to this function, give fresh modules each time with import-fresh
        initializedModules[modules[j]] = importFresh('../services/' + modules[j]);

        this.initService(initializedModules[modules[j]], config, function (error) {
            if (error) {
                throw new Error('Unable to inject core service');
            }

            initializedCount++;
            if (initializedCount === modules.length) {
                return callback(initializedModules);
            }
        });
    }
};

/*
 * Load defaults.json from blueoak-server to merge with a given config to ensure core services
 * function as intended.
 */
function augmentConfigWithDefaults (config) {
    var defaultConfig = loadJson(path.join(__dirname, '/../defaults.json'));

    return populateMissingProperties(defaultConfig, config);
}

/*
 * Recursively populate missing properties and values in the given injectCore() configuration
 */
function populateMissingProperties (defaultConfig, config) {
    for (var property in defaultConfig) {
        if (_.isObject(defaultConfig[property]) && !(_.isArray(defaultConfig[property]))) {
            if (!config[property]) {
                config[property] = {};
            }

            populateMissingProperties(defaultConfig[property], config[property]);
        } else {
            if (!config[property]) {
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
        get: function (name) {
            console.log('Get', name);
            return serviceMap[name];
        }
    };

    var paramNames = di.getParamNames(mod.init);
    var mockParams = [];
    _.forEach(paramNames, function(paramName) {
        if (!serviceMap[paramName]) {
            // use import-fresh to make sure we have fresh modules 
            serviceMap[paramName] = importFresh('./mocks/' + paramName);
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
        return callback(thrownError);
    }
};

exports.restore = _.noop;

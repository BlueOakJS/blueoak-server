/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
'use strict';
var path = require('path'),
    async = require('async'),
    _ = require('lodash'),
    di = require('./di'),
    subRequire = require('./subRequire'),
    depCalc = require('./dependencyCalc');

var debug = require('debug')('loader');

/**
 * The loader is used for dependency injection by the services container, and by the express/middleware service.
 *
 * services - services will be initialized in a well-defined order based on the dependency injection.
 *
 * consumers - like services except nothing will ever depend on a consumer.
 * It's therefore safe to load consumers in any order after services have been initialized.
 * Consumers are registered with a prefix in their name to avoid name collisions with services.
 * Since nothing has to reference a consumer by name, it doesn't matter what its name is.
 *
 * So at startup we do this
 * 1. Load all the service modules
 * 2. Load all the consumers (middleware, handlers)
 * 3. Initialize the services
 *
 * It's up to the services to init the consumers
 */
function createLoader() {

    var moduleMap = {}; //map id to module
    var dependencyMap = {}; //map id to list of dependencies
    var injectedMap = {}; //map id of objects that were manually injected
    var consumerMap = {}; //consumers will never be depended on by anything
    var initMods = [];  //list of all modules that have been initialized
    var notifyList = []; //list of notification callbacks for different modules
    var timerMap = []; //map of id to timers which we use to ensure async services load in a reasonable time

    /**
     * Load a module with the given module name/id.
     * A normal require call is used under the covers, so it assume the module is available
     * somewhere in the node load path.
     *
     * In the cases that we're loading a service module that's a dependency of another external service module,
     * we have to do some magic with the require cache to properly load it.
     * @param id
     */
    function loadExternalModule(parentId, id) {

        //if parent id is a consumer, i.e. was registered with a prefix,
        //strip the prefix off since that's not part of the module name
        parentId = parentId.indexOf('.') > -1 ? parentId.substring(parentId.indexOf('.') + 1) : parentId;

        var mod = subRequire(id, parentId);
        moduleMap[id] = mod;
        dependencyMap[id] = normalizeServiceNames(di.getParamNames(mod.init));
    }

    /**
     * Recursively find any unmet dependencies in the dependency tree.
     * Unmet dependencies are assumed to be third party modules, so it will
     * continue to load those modules until all dependencies have been met.
     */
    function fetchUnmetDependencies() {
        var runAgain = false;
        for (var id in dependencyMap) {
            var deps = dependencyMap[id];
            deps.forEach(function (depId) {
                if (!dependencyMap[depId] && !injectedMap[depId]) {
                    try {
                        loadExternalModule(id, depId);
                    } catch (err) {
                        throw new Error('Error loading dependency ' + depId + ' for ' + id + ': ' + err.message);
                    }

                    runAgain = true;
                }
            });
        }

        if (runAgain) { //continue until all we don't have any more unmet dependencies
            fetchUnmetDependencies();
        }
    }

    /**
     * Return a group of dependency load order, e.g.
     * [ ['a'], ['b', 'c'], ['d'] ].
     * If initList is specified, the dependencies will be grouped such that
     * they load in series.
     *
     * @param initList - an array of dependencies to force an order
     * @returns {*}
     */
    function calculateDependencyTree(initList) {
        if (initList) {
            var depGroups = [];
            initList.forEach(function(initList) {
                depGroups.push([initList]);
            });
            return depGroups;

        } else {

            var id;
            for (id in dependencyMap) {
                var mod = moduleMap[id];
                if (mod && mod.getDependencies) {

                    //dynamically look up deps with mod's getDependency function --used by express
                    var deps = normalizeServiceNames(mod.getDependencies.call(null, injectedMap['service-loader']));
                    debug('Found additional dependencies for %s', id, deps);
                    deps = _.unique(deps.concat(dependencyMap[id]));
                    depCalc.addNode(id, deps);
                } else {
                    depCalc.addNode(id, dependencyMap[id]);
                }
            }

            //injected modules have no dependencies by default
            for (id in injectedMap) {
                if (!dependencyMap[id]) { //when you do an inject, you can specify a dependency
                    depCalc.addNode(id, []);
                }
            }

            return depCalc.calcGroups(); //could throw an error
        }
    }

    return {
        /**
         * Register an object that wasn't loaded through the normal service/consumer mechanism.
         *
         * An optional dependency list can be specified.
         * @param id
         * @param obj
         * @param deps
         */
        inject: function (id, obj, deps) {
            var normId = normalizeServiceName(id);
            injectedMap[normId] = obj;

            if (deps) {
                dependencyMap[normId] = normalizeServiceNames(deps);
            }
        },

        /**
         * Load all the services in a given directory.
         *
         * The service is registered based on its filename, e.g. service.js is registered as service.
         * Dependencies are calculated based on the parameter names of the init method of the service.
         * @param dir
         * @param failOnDups - if specified, error out if there are name collisions with an existing service
         */
        loadServices: function (dir, failOnDups) {
            debug('Loading services from %s', dir);
            di.iterateOverJsFiles(dir, function(dir, file) {
                var modPath = path.resolve(dir, file);

                // load mock if appropriate
                if (global.__mockServices &&
                    _.includes(global.__mockServices, file.substring(0, file.indexOf('.js')))
                ) {
                    var mockPath = path.resolve(global.__appDir, 'tests', 'bos-mocks', 'services', file);
                    if (mockPath) {
                        modPath = mockPath;
                    }
                }

                var mod;
                try {
                    mod = subRequire(modPath); //subRequire inserts the _id field
                } catch (e) {
                    throw new Error('Could not load ' + modPath + ': ' + e.message);
                }
                registerServiceModule(mod, failOnDups);
            });

        },


        loadConsumers: function (dir, prefix) {
            debug('Loading %s consumers from %s', prefix, dir);

            di.iterateOverJsFiles(dir, function(dir, file) {
                var modPath = path.resolve(dir, file);
                var mod;
                try {
                    mod = require(modPath);
                } catch (e) {
                    throw new Error('Could not load ' + modPath + ': ' + e.message);
                }
                var modId = normalizeServiceName(file.slice(0, -3));
                registerConsumerModule(mod, modId, prefix);
            });
        },

        loadServiceModules: function (list) {

            //The way list comes back from the config, it's an array-like object, e.g.
            //{ 0: 'blah', 1:' blah'}
            if (!_.isArray(list)) {
                list = _.toArray(list);
            }

            list.forEach(function (modName) {
                var mod = subRequire(modName);
                registerServiceModule(mod);
            });
        },

        loadConsumerModules: function (prefix, list) {
            if (!_.isArray(list)) {
                list = _.toArray(list);
            }

            list.forEach(function (modName) {
                var mod = subRequire(modName);
                registerConsumerModule(mod, modName, prefix);
            });
        },

        initConsumers: function(prefix, initList, callback) {
            if (typeof initList === 'function') {
                callback = initList;
                initList = null; //if not specified, init everything

                debug('Init %s consumers', prefix, {initList: initList});
            }

            var depList = [];
            if (initList) { //force init in the given order
                for (var i = 0; i < initList.length; i++) {
                    var modId = prefix + '.' + normalizeServiceName(initList[i]);
                    if (!consumerMap[modId]) {
                        return callback(new Error('Could not find ' + prefix + ' named ' + initList[i]));
                    }
                    depList.push(modId);
                }

            } else {
                //init all the services with the given prefix in the calculated order
                for (var key in consumerMap) {
                    if (key.indexOf(prefix + '.') === 0) {
                        depList.push(key);
                    }
                }
            }

            async.eachSeries(depList, function initConsumer(serviceId, initCallback) {
                var toLoad = consumerMap[serviceId];
                var isAsync = di.hasCallback(toLoad.init);

                var params = [];
                var deps = dependencyMap[serviceId];

                for (var i = 0; i < deps.length; i++) {
                    //will either come from module map or manual injection
                    var depMod = moduleMap[deps[i]] || injectedMap[deps[i]];
                    params.push(depMod);
                }
                if (isAsync) {
                    params.push(function(err) { //this will be the callback function for async services
                        //clear any timer we might have for async services
                        if (timerMap[serviceId]) {
                            clearTimeout(timerMap[serviceId]);
                            delete timerMap[serviceId];
                        }
                        initCallback(err);
                    });
                    //Every 5 seconds if a service is still loading, we'll print an error
                    timerMap[serviceId] = setInterval(function() {
                        console.warn(serviceId,
                            'is still initializing. Check that the callback is being called');
                    }, 5000);
                    toLoad.init.apply(this, params);
                } else {
                    try {
                        toLoad.init.apply(this, params);
                    } catch (err) { //sync inits will have to throw errors to communicate problems
                        return initCallback(err);
                    }
                    initCallback();
                }
            }, function initConsumerCallback(err) {
                callback(err);
            });

        },

        init: function (initList, callback) {
            debug('Init services', {initList: initList});
            if (typeof initList === 'function') {
                callback = initList;
                initList = null; //if not specified, init everything
            }

            try {
                fetchUnmetDependencies();
            } catch (err) {
                //can occur if an external dependency module isn't available
                return callback(err);
            }

            //calculate the dep tree and then init in order
            var depGroups = [];

            try {
                depGroups = calculateDependencyTree(initList);
                debug('Dependency tree, %s', JSON.stringify(depGroups));
            } catch (err) {
                //can fail for circular dependencies
                return callback(err);
            }

            var loader = this;
            async.eachSeries(depGroups, function (serviceIds, groupCallback) {

                async.each(serviceIds, function (serviceId, serviceCallback) {

                    //if this is a injected dependency or consumer, no need to init
                    if (injectedMap[serviceId] || consumerMap[serviceId]) {
                        return serviceCallback();
                    }

                    //if this service was already initialized, such as with bootstrapped services, skip
                    if (initMods.indexOf(serviceId) > -1) {
                        return serviceCallback();
                    }

                    var toLoad = moduleMap[serviceId];

                    var isAsync = di.hasCallback(toLoad.init);

                    var params = [];
                    var deps = dependencyMap[serviceId];
                    for (var i = 0; i < deps.length; i++) {
                        //will either come from module map or manual injection
                        var depMod = moduleMap[deps[i]] || injectedMap[deps[i]];
                        params.push(depMod);
                    }

                    if (isAsync) {
                        params.push(function(err) {  //this will be the callback function for async services
                            //clear any timer we might have for async services
                            if (timerMap[serviceId]) {
                                clearTimeout(timerMap[serviceId]);
                                delete timerMap[serviceId];
                            }
                            notifyInit.call(loader, serviceId);
                            serviceCallback(err);
                        });

                        //Every 5 seconds if a service is still loading, we'll print an error
                        timerMap[serviceId] = setInterval(function() {
                            console.warn(serviceId,
                                'is still initializing. Check that the callback is being called');
                        }, 5000);
                        toLoad.init.apply(this, params);

                    } else {
                        try {
                            toLoad.init.apply(this, params);
                            notifyInit.call(loader, serviceId);
                        } catch (err) { //sync inits will have to throw errors to communicate problems
                            return serviceCallback(err);
                        }
                        serviceCallback();
                    }
                }, function (err) {
                    groupCallback(err);
                });
            }, function (err) {
                callback(err);
            });
        },

        get: function (id) {
            return moduleMap[normalizeServiceName(id)] || injectedMap[id];
        },

        unload: function(id) {
            subRequire.unload(id);
        },

        getConsumers: function(prefix) {
            var toReturn = [];
            for (var key in consumerMap) {
                if (key.indexOf(prefix + '.') === 0) {
                    toReturn.push(consumerMap[key]);
                }
            }
            return toReturn;
        },

        getConsumer: function(prefix, id) {
            var key = prefix + '.' + normalizeServiceName(id);
            return consumerMap[key];
        },

        //This is what we would expose for apps to use to manually load services
        getRegistry: function() {
            var loader = this;
            return {
                //callback is optional, but will guarantee module was initialized
                get: function(name, callback) {
                    if (!_.isString(name)) {
                        debug('To get a registered service, the service name must be provided.');
                        return;
                    }

                    var normalizedName = normalizeServiceName(name);
                    if (!callback) { //sync version
                        if (initMods.indexOf(normalizedName) < 0) { //hasn't been initialized
                            debug('Using services.get on %s before it has been initialized.', name);
                        }
                        return loader.get(normalizedName);

                    } else { //async version
                        if (initMods.indexOf(normalizedName) > -1) { //already initialized
                            debug('Found already-initialized module %s, invoking callback.', name);
                            return callback(loader.get(normalizedName));
                        } else {
                            debug('Adding callback %s to notify list for service %s', (callback.name || '<anonymous>'),
                                name);
                            notifyList.push({name: normalizedName, callback: callback});
                        }
                    }
                }
            };
        },

        listServices: function() {
            return _.keys(moduleMap);
        }
    };

    function registerServiceModule(mod, failOnDup) {

        if (mod.__id.indexOf('.') > -1) { //don't allow periods in module names
            throw new Error('Service with name \'' + mod.__id + '\' is invalid. Names cannot contain periods.');
        }

        if (!mod.init) {
            debug('%s module has no init. Skipping', mod.__id);
            return;
        }

        var normId = normalizeServiceName(mod.__id);
        if (failOnDup && moduleMap[normId]) {
            throw new Error('Service with name \'' + mod.__id + '\' already exists. Use a different name.');
        }
        moduleMap[normId] = mod;
        dependencyMap[normId] = normalizeServiceNames(di.getParamNames(mod.init));
    }

    function registerConsumerModule(mod, modId, prefix) {

        if (modId.indexOf('.') > -1) { //don't allow periods in module names
            throw new Error('Module with name \'' + modId + '\' is invalid. Names cannot contain periods.');
        }

        if (!mod.init) {
            mod.init = function() {}; //set a default init method since it's optional for consumers
        }

        mod.__id = modId;
        consumerMap[prefix + '.' + modId] = mod;
        dependencyMap[prefix + '.' + modId] = normalizeServiceNames(di.getParamNames(mod.init));
    }

    function notifyInit(serviceId) {

        var events = this.get('events'); //might be null in unit tests since it's injected
        if (events) {
            events.emit(serviceId + ':init:done');
        }

        initMods.push(serviceId); //add to list of mods that have been initialized
        debug('Notifying %s was initialized', serviceId);

        //find any callbacks that are registered for this module.
        //loop backwards so that we can delete the item from the array after we do the callback
        for (var i = notifyList.length - 1; i >= 0; i--) {
            if (notifyList[i].name === serviceId) {
                debug('Found notification callback for %s', serviceId);
                notifyList[i].callback(this.get(serviceId));
                notifyList.splice(i, 1);
            }
        }
    }
}

/*
 * Strips the prefix + suffix underscores from the service name, allowing you to inject the service
 * without having to think of an alternative name.  For example, you can inject the logger service
 * as "_logger_" and still be free to assign the service to the variable "logger".
 *
 * camelCamel strings are then coverted into dash-case. Based off of:
 * https://github.com/epeli/underscore.string/blob/master/dasherize.js
 */
function normalizeServiceName(str) {
    if (/^_.+_$/.test(str)) {
        str = str.slice(1, str.length);
        str = str.slice(0, str.length - 1);
    }

    return str.replace(/([A-Z])/g, '-$1').replace(/[-_\s]+/g, '-').toLowerCase();
}

function normalizeServiceNames(names) {
    return _.map(names, function normalize(paramName) {
        return normalizeServiceName(paramName);
    });
}

exports = module.exports = createLoader;

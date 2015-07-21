/* Copyright ? 2015 PointSource, LLC. All rights reserved. */
var path = require('path');
var sprout = require('./sprout');

var serverRoot = path.resolve(__dirname, '../');

module.exports = function(loader) {

    return {

        //Loads the config and logger services
        //This should always be called before initProject
        //For the master process, only bootstrap will be called
        bootstrap: function(callback) {
            var toInit = ['config', 'logger'];
            loader.loadServices(path.resolve(serverRoot, 'services'));
            injectDependencies(loader);

            loader.init(toInit, function(err) {
                callback(err);
            });
        },

        initProject: function(callback) {
            loader.loadServices(path.resolve(serverRoot, 'services'));
            injectDependencies(loader);
            var config = loader.get('config');

            loader.loadServiceModules(config.get('services'));

            try {
                //failOnDup tells the loader to error out if there are any services with duplicate names
                //We surround in a try-catch to handle such a  case
                //e.g. if a user tries to create a service named 'logger'
                loader.loadServices(path.resolve(global.__appDir, 'services'), true /*failOnDup*/); //app services
            } catch (err) {
                return callback(err);
            }

            loader.loadConsumerModules('handlers', config.get('handlers'));
            loader.loadConsumers(path.resolve(serverRoot, 'middleware'), 'middleware'); //sprout middleware
            loader.loadConsumers(path.resolve(global.__appDir, 'middleware'), 'middleware'); //app middleware

            loader.loadConsumers(path.resolve(serverRoot, 'handlers'), 'handlers'); //sprout handlers
            loader.loadConsumers(path.resolve(global.__appDir, 'handlers'), 'handlers'); //app handlers

            loader.loadConsumers(path.resolve(global.__appDir, 'auth'), 'auth'); //app authenticators
            loader.loadConsumers(path.resolve(serverRoot, 'auth'), 'auth'); //sprout authenticators

            if (sprout.isSproutApp()) { //has a sprout-assets.json
                sprout.loadPackages(loader);
            } else {
                //not a sprout app
            }

            loader.init(null, function(err) {
                callback(err);
            });
        }
    }

}

//Injects items into the loader that aren't loaded through the normal services mechanism
function injectDependencies(serviceLoader) {

    var EventEmitter = require('events').EventEmitter;
    serviceLoader.inject('events', new EventEmitter());

    //inject itself so that services can directly use the service loader
    serviceLoader.inject('serviceLoader', serviceLoader);

    //app will be injected by middleware, so this is a placeholder to force our dependency calculations to be correct
    serviceLoader.inject('app', {}, ['middleware']);
}


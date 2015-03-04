/*
 * The express service takes care of creating the express apps, registering handlers, and then starting the server
 * listening on each configured port.
 */
var _ = require('lodash'),
    path = require('path'),
    async = require('async'),
    fs = require('fs'),
    https = require('https'),
    di = require('../lib/di');

var _logger;

exports.init = function(logger, config, middleware, serviceLoader, callback) {
    _logger = logger;
    var cfg = config.get('express');

    //handlers
    serviceLoader.initConsumers('handlers', function initHandlersCallback(err) {
        registerDeclarativeRoutes(middleware.getApp(), config.get('routes'), serviceLoader, logger);
        callback(err);
    });

};

/*
 * Load the "routes" config and register all the routes.
 * Any errors that might occur because of mis-configured routes will be logged.
 */
function registerDeclarativeRoutes(app, routes, serviceLoader, logger) {

    var consumers = serviceLoader.getConsumers('handlers');

    _.keys(routes).forEach(function(routePath) {
        //routePath should be of form "<method> path"
        var parts = routePath.split(' ');
        if (parts.length !== 2) {
            return logger.warn('Invalid route path "%s"', routePath);
        }

        var methods = ['get', 'post', 'put', 'delete', 'all'];

        if (!_.includes(methods, parts[0])) {
            return logger.warn('Invalid method "%s" on route "%s"', parts[0], parts[1]);
        }

        var handler = routes[routePath].handler;
        if (!handler) {
            return logger.warn('Missing handler for route "%s"', parts[1]);
        }

        //handler is something like foo.bar where there's a foo.js handler module which exports bar
        var handlerParts = handler.split('.');

        if (handlerParts.length !== 2) {
            return logger.warn('Invalid handler reference "%s"', parts[1]);
        }

        var handlerMod = _.findWhere(consumers, {__id: handlerParts[0]});
        if (!handlerMod) {
            return logger.warn('Could not find handler module named "%s".', handlerParts[0]);
        }

        var handlerFunc = handlerMod[handlerParts[1]];
        if (!handlerFunc) {
            return logger.warn('Could not find handler function "%s" for module "%s"', handlerParts[1], handlerParts[0]);
        }

        //register the route and handler function with express
        app[parts[0]].call(app, parts[1], handlerFunc);
    });

}


//Express service is a little different in that it can't start until all the services
//needed by handlers and middleware are loaded.
//This will dynamically look up all the middleware and handlers and return their dependencies
exports.getDependencies = function(serviceLoader) {
    var mods = serviceLoader.getConsumers('handlers');
    var params = [];
    for (var i = 0; i < mods.length; i++) {
        params = params.concat(di.getParamNames(mods[i].init));
    }
    return _.unique(params);
};


function startExpress(cfg, app, callback) {
    //Is this ssl-enabled?
    if (cfg.ssl) {

        var sslOptions = null;
        try {
            //Will get an error if one of the files couldn't be read
            sslOptions = resolveSSLOptions(cfg.ssl);
        } catch (err) {
            return callback(new Error('Error reading SSL options: ' + err.message));
        }
        var server = https.createServer(sslOptions, app);
        server.listen(cfg.port, function () {
            var host = server.address().address;
            var port = server.address().port;
            _logger.info('App is listening securely on https://%s:%s', host, port);
            callback();
        }).on('error', function (err) {
            callback(err);
        });
    } else {

        //Non SSL
        var server = app.listen(cfg.port, function () {
            var host = server.address().address;
            var port = server.address().port;
            _logger.info('App is listening on http://%s:%s', host, port);
            callback();
        }).on('error', function (err) {
            callback(err);
        });
    }
}

/**
 * Return a set of SSL options with the file-based options expanded into actual files/buffers.
 * The file-based fields are key, cert, pfx, and ca, where ca can also be an array of files
 * @param options
 * @returns An expanded clone of the original options
 */
function resolveSSLOptions(options) {
    var toReturn = _.clone(options);
    //Resolve the file-based properties
    _.keys(toReturn).forEach(function(key) {
        if (key === 'cert' || key === 'key' || key === 'pfx') {
            toReturn[key] = fs.readFileSync(path.resolve(global.__appDir, toReturn[key]));
        } else if (key === 'ca') { //this can be an array
            if (_.isArray(toReturn[key])) {
                //array
                toReturn[key] = _.map(toReturn[key], function(val) {
                    return fs.readFileSync(path.resolve(global.__appDir, val));
                });
            } else {
                //Single value
                toReturn[key] = fs.readFileSync(path.resolve(global.__appDir, toReturn[key]));
            }
        }
    });
    return toReturn;
}
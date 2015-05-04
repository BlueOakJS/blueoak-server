/* Copyright © 2015 PointSource, LLC. All rights reserved. */
/*
 * The express service takes care of creating the express apps, registering handlers, and then starting the server
 * listening on each configured port.
 */
var _ = require('lodash'),
    path = require('path'),
    async = require('async'),
    fs = require('fs'),
    https = require('https'),
    di = require('../lib/di'),
    cfenv = require('cfenv');

var _logger;
var server;

exports.init = function(logger, config, middleware, auth, serviceLoader, callback) { //should start after middleware and auth
    _logger = logger;
    var cfg = config.get('express');

    //handlers
    serviceLoader.initConsumers('handlers', function initHandlersCallback(err) {
        //registerDeclarativeRoutes(middleware.getApp(), config.get('routes'), serviceLoader, logger);
        if (err) {
            return callback(err);
        }
        startExpress(cfg, middleware.getApp(), callback);
    });

};

exports.stop = function(callback) {
    if (server) {
        server.close(callback);
    } else {
        if (callback) {
            callback();
        }
    }
};

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

    //Use this to allow sprout server to run in bluemix/cloud foundry.
    //instead of using the port from the config, use the port form the CF env info
    if (!cfenv.getAppEnv().isLocal) {
        _logger.info('Running in Cloud Foundry environment');
        cfg.port = cfenv.getAppEnv().port;
    }

    //Is this ssl-enabled?
    if (cfg.ssl) {

        var sslOptions = null;
        try {
            //Will get an error if one of the files couldn't be read
            sslOptions = resolveSSLOptions(cfg.ssl);
        } catch (err) {
            return callback(new Error('Error reading SSL options: ' + err.message));
        }
        server = https.createServer(sslOptions, app);
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
        server = app.listen(cfg.port, function () {
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
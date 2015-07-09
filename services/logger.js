/* Copyright © 2015 PointSource, LLC. All rights reserved. */
var _ = require('lodash'),
    winston = require('winston'),
    path = require('path'),
    cluster = require('cluster'),
    stackTrace = require('stack-trace');

exports.init = function(config) {

    var cfg = config.get('logger');
    var showLocation = cfg.showLocation;

    var logger = new (winston.Logger)({
        levels: cfg.levels
    });

    var workerCount = config.get('cluster').maxWorkers; //if workerCount === 1, don't display the pid

    winston.addColors(cfg.colors);

    //first attempt to load a code-based logger from <app>/logger.js
    //If that doesn't work we'll continue to use the normal config
    try {
        var extLogger = require(global.__appDir + '/' + 'logger');
        extLogger.init(logger);
    } catch (err) {
        setupTransports(cfg, logger);
    }

    _.keys(cfg.levels).forEach(function(level) {

        module.exports[level.toLowerCase()] = function() {

            var args = [].slice.call(arguments); //convert to pure array
            if (workerCount !== 1) { //cluster mode
                var meta = {};
                if (_.isObject(args[args.length - 1])) {
                    meta = args[args.length - 1];
                } else {
                    [].push.call(args, meta);
                }

                //if we're logging on behalf of a worker process, this will already be set
                if (!meta.pid) {
                    meta.pid =  process.pid;
                }

                //if we're in clustered mode, throw the service name in the metadata
                if (showLocation) {
                    var location = getLocation();
                    if (location) {
                        meta.service = location;
                    }
                }
            }

            if (cluster.isWorker) {
                var str = JSON.stringify({
                    level: level,
                    args: args
                });
                process.send(str);
            } else {
                if (workerCount === 1 && showLocation) {
                    var location = getLocation();
                    if (location) {
                        args[0] = location + ' - ' + args[0];
                    }
                }
                logger[level.toLowerCase()].apply(logger, args);
            }

        };
    });

};

//Determine the name of the service that called logger
function getLocation() {
    var trace = stackTrace.get();

    //use index 2 because 0 is the call to getLocation, and 1 is the call to logger
    var mod = require(trace[2].getFileName());
    if (mod) { //__id is injected into services by the loader
        return mod.__id;
    }
    return null;
}

function setupTransports(cfg, logger) {

    //dynamically add transports based on the config
    //Each transport will have a package, which is the package name of the transport, e.g. winston-papertrail
    //and a field, which is the field within the transport containing the instance, e.g. Papertrail
    cfg.transports.forEach(function(transport) {
        transport.options = transport.options || {};
        var locationsToTry = [
            transport.package,
            path.join(global.__appDir, 'node_modules', transport.package),
            path.join(global.__appDir, transport.package)
        ];
        var mod = null;
        for (var i = 0; i < locationsToTry.length; i++) {
            try {
                mod = require(locationsToTry[i]);
                break;
            } catch (err) {
                //try next
            }
        }
        if (mod === null) {
            throw new Error('Could not locate logger transport package ' + transport.package + '.');
        }

        var obj = mod;

        //if transport field is something like transports.Console, split at the dots and dereference each part
        transport.field.split('.').forEach(function(field) {
            obj = obj[field];
        });
        logger.add(obj, transport.options);
    });

}
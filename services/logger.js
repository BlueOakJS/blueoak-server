/*
 * Copyright 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var _ = require('lodash'),
    winston = require('winston'),
    path = require('path'),
    cluster = require('cluster'),
    stackTrace = require('stack-trace'),
    util = require('util');


exports.init = function (config) {

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

    _.keys(cfg.levels).forEach(function (level) {

        module.exports[level.toLowerCase()] = function () {

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
                    meta.pid = process.pid;
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
                buffer(level.toLowerCase(), args);
            }

        };
    });

    module.exports['components'] = cfg.components;
    module.exports['logger'] = logger;
    module.exports['levels'] = cfg.levels;
    module.exports['getComponentLogger'] = function (component) {
        var theLogger = this.logger;
        if (!this.components || !this.components[component] || !this.components[component].loglevels) {
            theLogger.error('The component logger ' + component + ' is not configured or not configured properly. Using base logger.');
            return theLogger;
        }
        var loglevels = this.components[component].loglevels;

        var tmp = {'component': component};
        var self = this;
        _.keys(this.levels).forEach(function (lev) {
            tmp[lev] = function () {
                var args = [].slice.call(arguments);
                args[0] = this.component + ' - ' + args[0];
                var tlevels = [];
                //look through transports and save current log levels
                Object.keys(theLogger.transports).forEach(function (k) {
                    tlevels.push([k, theLogger.transports[k].level]);
                    var newLevel = loglevels[k];
                    if (newLevel) { // if overridden by component, set the loglevel for this transport
                        theLogger.transports[k].level = newLevel;
                    }
                });
                self[lev](args);
                tlevels.forEach(function (levelinfo) { // restore all the transport loglevels
                    theLogger.transports[levelinfo[0]].level = levelinfo[1];
                });
            };
        });
        return tmp;
    };

    //The buffer stores all logged data, regardless of log level
    //rather than relying on array.push/slice which are slow,
    //we keep the buffer a fixed size and just loop the index around
    var crashDumpCfg = config.get('crashDump') || {};
    var bufferIdx = 0;
    var bufferLength = crashDumpCfg.length;
    var bufferData = [];
    var bufferEnabled = crashDumpCfg.enabled;

    function buffer(level, args) {
        if (bufferEnabled) {
            bufferData[bufferIdx] = {args: args, ts: Date.now(), level: level};
            bufferIdx++;
            if (bufferIdx > bufferLength) {
                bufferIdx = 0;
            }
        }
    }

    //TODO: support different dump types, e.g. console vs file
    exports.dumpBuffer = function () {

        if (bufferEnabled) {
            console.log('---------- Crash Report ' + (new Date().toString()) + ' ----------');
            console.log('PID:         ', process.pid);
            console.log('Uptime:      ', process.uptime() + 's');
            console.log('Heap used:   ', process.memoryUsage().heapUsed);
            console.log('Heap total:  ', process.memoryUsage().heapTotal);

            var log = function (data) {
                console.log('' + data.ts + ' ' + data.level + ': ' + util.format.apply(null, data.args));
            };

            for (var i = bufferIdx; i < bufferData.length; i++) {
                log(bufferData[i]);
            }

            for (var i = 0; i < bufferIdx; i++) {
                log(bufferData[i]);
            }
        }
    };

};


//Determine the name of the service or javascript module that called logger
function getLocation() {
    var trace = stackTrace.get();

    //trace.forEach(function(e){
    //    console.log('mytrace: ' + e.getFileName());
    //});

    //use (start at) index 2 because 0 is the call to getLocation, and 1 is the call to logger
    //  However, component loggers put an extra level in, so search down until the location is not 'logger'
    //  There's code to search a long way down the stack, but in practice the next (3) will be hit and used
    //    since its name is not logger.
    var idx = 2;
    var modNm = 'logger';
    var rmodNm = null;
    var skip = ['logger', 'logger.js'];
    while ((skip.indexOf(modNm) >= 0) && trace.length > idx) {
        var fpath = trace[idx].getFileName();
        ++idx;
        if (fpath.slice(0, 'native'.length) === 'native') {
            continue; // skip native modules
        }
        modNm = null;
        var mod = null;
        try {
            mod = require(fpath);
        } catch (err) {
            // do nothing here, it's checked later
        }
        if (mod) { //__id is injected into services by the loader
            if (!mod.__id) {
                modNm = fpath.split('/').pop();
                rmodNm = modNm;
            } else {
                modNm = mod.__id;
                if (modNm !== null) {
                    rmodNm = modNm;
                }
            }
        } else {
            modNm = fpath.split('/').pop();
            rmodNm = modNm;
        }
    }
    return rmodNm;
}

function setupTransports(cfg, logger) {
    var func = 'setupTransports';
    //dynamically add transports based on the config
    //Each transport will have a package, which is the package name of the transport, e.g. winston-papertrail
    //and a field, which is the field within the transport containing the instance, e.g. Papertrail
    cfg.transports.forEach(function (transport) {
        transport.options = transport.options || {};
        if (typeof transport.options.timestamp !== 'undefined') {
            var ts = transport.options.timestamp;

            if (ts === true || ts === false) {
                //don't need to do anything -- already handled by winston
            } else {
                //is a string
                try {
                    var tsm = require(global.__appDir + '/' + ts);
                    if (typeof tsm.init === 'function' && typeof tsm.timestamp === 'function') {
                        transport.options.timestamp = tsm.timestamp;
                        tsm.init(); // allow one-time init if necessary, but require the function to be there
                    } else {
                        transport.options.timestamp = true;
                        throw new Error('timestamp module must contain timestamp and init functions.');
                    }
                    try {
                        console.log(func + ': type of transport.options.timestamp is now: ' + typeof tsm.timestamp);
                    } catch (err) {
                        console.log(func + ': error parsing timestamp type (true/false/modulename) - ' + err);
                    }
                } catch (err) {
                    //not sure, set it to true....
                    console.log(func + ': defaulting timestamp to true. ' + err);
                }
            }

        }
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
        transport.field.split('.').forEach(function (field) {
            obj = obj[field];
        });
        logger.add(obj, transport.options);
    });

}


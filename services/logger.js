var _ = require('lodash'),
    winston = require('winston'),
    path = require('path'),
    cluster = require('cluster');

exports.init = function(config) {

    var cfg = config.get('logger');

    var logger = new (winston.Logger)({
        levels: cfg.levels
    });

    var workerCount = config.get('cluster').maxWorkers; //if workerCount === 1, don't display the pid

    winston.addColors(cfg.colors);

    //dynamically add transports based on the config
    //Each transport will have a package, which is the package name of the transport, e.g. winston-papertrail
    //and a field, which is the field within the transport containing the instance, e.g. Papertrail
    cfg.transports.forEach(function(transport) {
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

    _.keys(cfg.levels).forEach(function(level) {
        module.exports[level.toLowerCase()] = function() {
            var args = [].slice.call(arguments); //convert to pure array
            if (workerCount !== 1) {
                var meta = {};
                if (typeof args[args.length - 1] === 'object') {
                    meta = args[args.length - 1];
                } else {
                    [].push.call(args, meta);
                }

                //if we're logging on behalf of a worker process, this will already be set
                if (!meta.pid) {
                    meta.pid =  process.pid;
                }
            }

            if (cluster.isWorker) {
                var str = JSON.stringify({
                    level: level,
                    args: args
                });
                process.send(str);
            } else {
                logger[level.toLowerCase()].apply(logger, args);
            }

        };
    });

};

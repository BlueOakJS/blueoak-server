/* Copyright © 2015 PointSource, LLC. All rights reserved. */
var path = require('path'),
    fs = require('fs'),
    _ = require('lodash'),
    async = require('async'),
    q = require('q'),
    cluster = require('cluster');

var loader = require('./lib/loader');
var serviceLoader = loader();

global.services = serviceLoader.getRegistry();

var server = module.exports;

//set the app root to the directory the main module was executed from
global.__appDir = path.normalize(path.join(process.mainModule.filename, '../'));

//Opts is optional
module.exports.init = function (opts, callback) {

    if (typeof opts === 'function') {
        callback = opts;
        opts = {};
    }

    if (opts.appDir) {
        global.__appDir = opts.appDir;
    }

    //Load the bootstrap services first (config and logging) since they're only needed for the master
    initServices({bootstrap: true}, function (err) {
        if (err) {
            if (cluster.isMaster) {
                return callback(err);
            } else {
                //TODO: Don't like having to duplicate the startupComplete message
                var message = {cmd: 'startupComplete', procId: process.pid};
                message.error = err.message;
                process.send(message);
            }
        }

        var clusterCount = 0;
        if (cluster.isMaster) {

            var clusterConfig = serviceLoader.get('config').get('cluster');
            var logger = serviceLoader.get('logger');

            printVersion(logger);

            // Either set to maxWorkers, or if < 0, use the count of machine's CPUs
            var workerCount = clusterConfig.maxWorkers < 0 ? require('os').cpus().length : clusterConfig.maxWorkers;

            //If there's only one worker defined, then it's easier to just run everything on the master
            //That avoid issues with trying to connect a debugger during development
            if (clusterConfig.maxWorkers === 1) {
                logger.info('Clustering is disabled');
                process.env.decryptionKey = serviceLoader.get('config').decryptionKey;
                return initServices(function (err) {
                    if (err) {
                        console.warn(err.stack);
                    }
                    return callback(err);
                });
            } else {
                async.timesSeries(workerCount, function(n, next) {
                    forkWorker(next);
                }, function(err, result) {
                    callback(err);
                    cluster.on('exit', function(worker, code, signal) {
                        logger.info('Worked %d stopped (%s). Restarting', worker.process.pid, signal || code);
                    });
                });
            }

        } else {
            initWorker();
        }

    });
};

function forkWorker(callback) {
    var logger = serviceLoader.get('logger');
    var worker = cluster.fork({decryptionKey: serviceLoader.get('config').decryptionKey});

    worker.on('message', function(msg) {
        try {
            var obj = JSON.parse(msg);
            logger[obj.level].apply(logger, obj.args);
        } catch(err) {
            logger.info(msg);
        }

        if (msg.cmd === 'startupComplete') {
            if (msg.error) {
                //Callback with the error
                return callback(new Error(msg.error));
            } else {
                callback();
            }
        }
    });
}

//master will send a 'stop' message to all the workers when it's time to stop
process.on('message', function(msg) {
    if (msg === 'stop') {
        stopServices();
    }
});


//gracefully handle ctrl+c
process.on('SIGINT', function() {
    module.exports.stop();
});


/*
 * On SIGHUP (restart) if we're in a clustered setup, we restart each worker process in sequence.
 * This will give us better uptime since there will always be a worker process available.
 * We also wait for a graceful shutdown of each worker so that existing requests are handled.
 */
process.on('SIGHUP', function() {

    var logger = serviceLoader.get('logger');

    if (isClusteredMaster()) {
        logger.info('Restarting worker processes.');
        var ids = _.map(cluster.workers, function(key, val) {
            return val;
        });

        //kill and restart each worker in series
        //This should give us 100% uptime as there will always be a worker available
        async.eachSeries(ids, function(id, next) {
            cluster.workers[id].send('stop');
            forkWorker(next);
        }, function(err, result) {
           logger.info('Restart complete');
        });
    } else if (cluster.isMaster) {
        logger.warn('Ignoring SIGHUP');
    }

});


//Stop the server
module.exports.stop = function () {
    stopServices();

    if (isClusteredMaster()) {
        Object.keys(cluster.workers).forEach(function (id) {
            cluster.workers[id].send('stop');
        });
    }

    //Just in case there's anything still running
    process.exit();
};

function stopServices() {
    //TODO: we should have a generic way of stopping all services

    //stop services on workers, or a master if it's a 1-worker cluster
    if (!isClusteredMaster()) {

        //try to do a graceful shutdown, note the express shutdown is async since it waits for requests to complete
        global.services.get('express').stop(function() {
            global.services.get('cache').stop();

            //and kill whatever is left
            process.exit();
        });

    }
}

/*
 * Returns true if this is a master server that has clustered workers.
 * Otherwise return false, i.e. for worker processes or single-process masters.
 */
function isClusteredMaster() {
    return cluster.isMaster && _.keys(cluster.workers).length > 0;
}

function initWorker() {

    //Use this callback to notify back to the cluster master that we're started, either successfully or with error
    var callback = function (err) {
        var message = {cmd: 'startupComplete', procId: process.pid};
        if (err) {
            console.warn(err.stack);
            message.error = err.message;
        }
        process.send(message);
    };

    initServices(function (err) {
        return callback(err);
    });
}

/**
 * @param opts
 * @param callback
 * @returns {*}
 */
function initServices(opts, callback) {
    if (!callback) {
        callback = opts;
        opts = {};
    }

    var bootstrap = opts.bootstrap || false;

    var toInit = null;

    if (opts.bootstrap) {
        toInit = ['config', 'logger'];
    }

    serviceLoader.loadServices(path.resolve(__dirname, 'services'));

    //inject itself so that services can directly use the service loader
    serviceLoader.inject('serviceLoader', serviceLoader);

    //app will be injected by middleware, so this is a placeholder to force our dependency calculations to be correct
    serviceLoader.inject('app', {}, ['middleware']);

    if (!opts.bootstrap) { //in bootstrap mode we only load the sprout services needed by master
        var config = serviceLoader.get('config');

        serviceLoader.loadServiceModules(config.get('services'));
        serviceLoader.loadServices(path.resolve(global.__appDir, 'services')); //app services

        serviceLoader.loadConsumerModules('handlers', config.get('handlers'));
        serviceLoader.loadConsumers(path.resolve(__dirname, 'middleware'), 'middleware'); //sprout middleware
        serviceLoader.loadConsumers(path.resolve(global.__appDir, 'middleware'), 'middleware'); //app middleware

        serviceLoader.loadConsumers(path.resolve(__dirname, 'handlers'), 'handlers'); //sprout handlers
        serviceLoader.loadConsumers(path.resolve(global.__appDir, 'handlers'), 'handlers'); //app handlers
    }


    serviceLoader.init(toInit, function(err) {
        callback(err);
    });

}

function printVersion(logger) {
    var packageFile = path.resolve(require.resolve('sprout-server'), '../package.json');
    var json = JSON.parse(fs.readFileSync(packageFile));
    logger.info('Starting %s v%s', json.name, json.version);
}

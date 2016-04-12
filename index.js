/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var path = require('path'),
    _ = require('lodash'),
    async = require('async'),
    cluster = require('cluster'),
    semver = require('semver');

var loader = require('./lib/loader');

var serviceLoader = loader();
var project = require('./lib/project')(serviceLoader);

global.services = serviceLoader.getRegistry();

//set the app root to the directory the main module was executed from
global.__appDir = path.normalize(path.join(process.mainModule.filename, '../'));

var workerNumberMap = {}; //map a worker pid to a worker number

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
                var message = {cmd: 'startupComplete', pid: process.pid};
                message.error = err.message;
                process.send(message);
                return; //return so that we don't attempt to initialize the worker
            }
        }

        if (cluster.isMaster) {

            var clusterConfig = serviceLoader.get('config').get('cluster');
            var logger = serviceLoader.get('logger');

            process.on('uncaughtException', function(err) {
                console.log(err.stack);
                logger.dumpBuffer(err);
                process.exit(1); //default behavior
            });

            printVersion(logger);
            checkNodeVersion(logger);

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

                //on exit, attempt to restart a worker process
                cluster.on('exit', handleClusterWorkerExit);

                async.timesSeries(workerCount, function(n, next) {
                    forkWorker(n, next);
                }, function(err, result) {
                    return callback(err);
                });
            }

        } else {
            initWorker();
        }

    });
};

function handleClusterWorkerExit(worker, code, signal) {
    var logger = serviceLoader.get('logger');

    if (worker.suicide === true) {
        //no need to fork.  We wanted the worker to die.
    } else {
        logger.info('Worker %d stopped (%s). Restarting', worker.process.pid, signal || code);
        var workerNumber = workerNumberMap[worker.process.pid];
        forkWorker(workerNumber, function () {
            //restarted
            logger.info('Restarted worker process');
        });
    }

}

function forkWorker(workerNumber, callback) {
    var logger = serviceLoader.get('logger');
    var worker = cluster.fork({decryptionKey: serviceLoader.get('config').decryptionKey});
    workerNumberMap[worker.process.pid] = workerNumber;
    worker.on('message', function(msg) {

        try {
            var obj = JSON.parse(msg);
            logger[obj.level].apply(logger, obj.args);
        } catch (err) {
            logger.info(msg);
        }

        if (msg.cmd === 'startupComplete') {
            if (msg.error) {

                //kill worker
                worker.kill();

                //Callback with the error
                return callback(new Error(msg.error));
            } else {
                return callback();
            }
        }
    });
}

//master will send a 'stop' message to all the workers when it's time to stop
process.on('message', function(msg) {
    var data = null;
    try {
        data = JSON.parse(msg);
    } catch (err) {
        //wasn't json data
    }

    if (data && data.cmd === 'stop') {
        module.exports.stop(false, function() {
            process.send(data);
        });
    }
});


//gracefully handle ctrl+c
process.on('SIGINT', function() {
    module.exports.stop(true, function() {
        //Just in case there's anything still running, shut it down
        if (cluster.isMaster) {
            process.exit(0);
        }
    });
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
            var workerNumber = workerNumberMap[cluster.workers[id].process.pid];

            sendCommand(cluster.workers[id], 'stop', function() {
                cluster.workers[id].kill(0);
                forkWorker(workerNumber, next);
            });

        }, function(err, result) {
            if (err) {
                logger.info(err);
            }

            logger.info('Restart complete');
        });
    } else if (cluster.isMaster) {
        logger.warn('Ignoring SIGHUP');
    }

});

function sendCommand(worker, command, callback) {
    var payload = {
        cmd: command,
        id: worker.id
    };

    var listener = function(msg) {
        var data = null;
        if (typeof msg === 'object') {
            data = msg;
        } else {
            data = JSON.parse(msg);
        }
        if (data.cmd === 'stop' && data.id === worker.id) {
            worker.removeListener('message', arguments.callee);
            return callback();
        }
    };

    worker.on('message', listener);
    worker.send(JSON.stringify(payload));

}

//Stop the server
//if force, don't bother restarting.  We were probably stopped by a ctrl+c
module.exports.stop = function (force, callback) {
    if (!callback) {
        callback = function() {};
    }

    if (isClusteredMaster()) {
        async.each(Object.keys(cluster.workers), function(id, next) {
            var worker = cluster.workers[id];
            sendCommand(worker, 'stop', function() {
                if (force) {
                    worker.kill();
                } else {
                    worker.process.exit(0);
                }
                next();
            });
        }, function(err) {
            callback(err);
        });
    } else {
        worker_stopServices(function() {
            callback();
        });
    }
};

function worker_stopServices(callback) {
    //TODO: we should have a generic way of stopping all services

    //stop services on workers, or a master if it's a 1-worker cluster
    if (!isClusteredMaster()) {
        //try to do a graceful shutdown, note the express shutdown is async since it waits for requests to complete
        global.services.get('express').stop(function() {

            var cache = global.services.get('cache');
            if (cache && cache.stop) { //might not exist if server didn't finish starting
                cache.stop();
            }

            var monitor = global.services.get('monitor');
            if (monitor) {
                monitor.stop();
            }
            callback();
        });
    } else {
        return callback();
    }
}

/*
 * Returns true if this is a master server that has clustered workers.
 * Otherwise return false, i.e. for worker processes or single-process masters.
 */
function isClusteredMaster() {
    return cluster.isMaster && serviceLoader.get('config').get('cluster').maxWorkers !== 1;
}

function initWorker() {

    //Use this callback to notify back to the cluster master that we're started, either successfully or with error
    var callback = function (err) {
        var message = {cmd: 'startupComplete', pid: process.pid};
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

    if (bootstrap) {
        project.bootstrap(function(err) {
            callback(err);
        });
    } else {
        project.initProject(function(err) {
            callback(err);
        });
    }

}

function printVersion(logger) {
    var pkg = require('./package.json');
    logger.info('Starting %s v%s in %s mode using Node.js %s', pkg.name, pkg.version,
        process.env.NODE_ENV || 'development', process.version); //the config loader defaults to development
}

function checkNodeVersion(logger) {
    var nodeCfg = serviceLoader.get('config').get('node');
    var minVersionRange = nodeCfg.version.min;
    var recommendedVersion = nodeCfg.version.recommended;
    if (!semver.satisfies(process.version, minVersionRange)) {
        logger.warn('Unsupported Node.js. Consider upgrading to at least v%s', recommendedVersion);
    }

}
/*
 * testUtility must be explicitly called in order to gain access to utility methods that are
 * helpful for testing BO Server projects.  Not intended for use in non-test environments.
 */
module.exports.testUtility = function () {
    return require('./testlib/util');
};


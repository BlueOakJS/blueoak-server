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

var forceShutdown = false; //if true, user hit ctrl+c and we don't want to restart workers

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
                var message = {cmd: 'startupComplete', pid: process.pid};
                message.error = err.message;
                process.send(message);
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
                async.timesSeries(workerCount, function(n, next) {
                    forkWorker(next);
                }, function(err, result) {

                    cluster.on('exit', function(worker, code, signal) {
                        if (!forceShutdown) {
                            logger.info('Worked %d stopped (%s). Restarting', worker.process.pid, signal || code);
                            forkWorker(function () {
                                //restarted
                                logger.info('Restarted worker process');
                            });
                        }
                    });
                    return callback(err);
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
        } catch (err) {
            logger.info(msg);
        }

        if (msg.cmd === 'startupComplete') {
            if (msg.error) {
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
    if (msg === 'stop') {
        stopServices();
    }
});


//gracefully handle ctrl+c
process.on('SIGINT', function() {
    module.exports.stop(true);
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
            if (err) {
                logger.info(err);
            }
            logger.info('Restart complete');
        });
    } else if (cluster.isMaster) {
        logger.warn('Ignoring SIGHUP');
    }

});


//Stop the server
//if force, don't bother restarting.  We were probably stopped by a ctrl+c
module.exports.stop = function (force) {
    if (force) {
        forceShutdown = true;
    }
    stopServices();

    if (isClusteredMaster()) {
        Object.keys(cluster.workers).forEach(function (id) {
            cluster.workers[id].send('stop');
        });
    }

    //Just in case there's anything still running, give it a second and shut it down
    setTimeout(function () {
        process.exit();
    }, 1000);

};

function stopServices() {
    //TODO: we should have a generic way of stopping all services

    //stop services on workers, or a master if it's a 1-worker cluster
    if (!isClusteredMaster()) {

        //try to do a graceful shutdown, note the express shutdown is async since it waits for requests to complete
        global.services.get('express').stop(function() {
            var cache = global.services.get('cache');
            if (cache && cache.stop) { //might not exist if server didn't finish starting
                cache.stop();
            }

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


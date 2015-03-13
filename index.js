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
            }

            // Create a worker for each CPU
            for (var i = 0; i < workerCount; i += 1) {
                var worker = cluster.fork({decryptionKey: serviceLoader.get('config').decryptionKey});

                worker.on('message', function(msg) {
                    try {
                        var obj = JSON.parse(msg);
                        logger[obj.level].apply(logger, obj.args);
                    } catch(err) {
                        logger.info(msg);
                    }
                });
            }

            var startupFailed = false;
            Object.keys(cluster.workers).forEach(function (id) {
                cluster.workers[id].on('message', function (msg) {
                    if (msg.cmd === 'startupComplete') {
                        clusterCount++;
                    }

                    if (msg.error) {
                        //Kill all the clusters
                        for (var id in cluster.workers) {
                            cluster.workers[id].kill();
                        }

                        //Callback with the error
                        startupFailed = true;
                        callback(new Error(msg.error));

                    }

                    if (clusterCount === workerCount) {
                        if (!startupFailed) { //prevent callback from being called twice, once with error and once without
                            callback();
                        }
                    }
                });
            });

        } else {
            initWorker();
        }

    });
};

//master will send a 'stop' message to all the workers when it's time to stop
process.on('message', function(msg) {
    if (msg === 'stop') {
        stopServices();
    }
});


//gracefully handle ctrl+c
process.on('SIGINT', function() {
    module.exports.stop();
    process.exit();
});

//Stop the server
module.exports.stop = function () {
    stopServices();

    Object.keys(cluster.workers).forEach(function (id) {
        cluster.workers[id].send('stop');
    });


    //Just in case there's anything still running
    process.exit();
};

function stopServices() {
    //TODO: we should have a generic way of stopping all services

    //stop services on workers, or a master if it's a 1-worker cluster
    if (!cluster.isMaster || (cluster.isMaster && _.keys(cluster.workers).length === 0)) {

        //try to do a graceful shutdown
        global.services.get('express').stop();
        global.services.get('cache').stop();

        //and kill whatever is left
        process.exit();
    }
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


        serviceLoader.loadServices(path.resolve(global.__appDir, 'services')); //app services

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

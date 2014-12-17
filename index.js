var path = require('path'),
    fs = require('fs'),
    express = require('express'),
    _ = require('lodash'),
    async = require('async'),
    q = require('q'),
    cluster = require('cluster'),
    serviceRegistry = require('./lib/serviceRegistry');

//Opts is optional
module.exports.init = function (opts, callback) {

    if (typeof opts === 'function') {
        callback = opts;
        opts = {};
    }

    //bootstrap the config registry
    var configService = require('./services/config');
    configService.init(serviceRegistry, function(err) {
        if (err) {
            return callback(err);
        }

        serviceRegistry.add(configService);

        var clusterCount = 0;
        if (cluster.isMaster) {

            var clusterConfig = configService.get('cluster');

            // Either set to maxWorkers, or if < 0, use the count of machine's CPUs
            var workerCount = clusterConfig.maxWorkers < 0 ? require('os').cpus().length : clusterConfig.maxWorkers;

            // Create a worker for each CPU
            for (var i = 0; i < workerCount; i += 1) {
                cluster.fork();
            }

            Object.keys(cluster.workers).forEach(function(id) {
                cluster.workers[id].on('message', function(msg) {
                    if (msg.cmd === 'startupComplete') {
                        clusterCount++;
                    }

                    if (msg.error) {
                        //Kill all the clusters
                        for (var id in cluster.workers) {
                            cluster.workers[id].kill();
                        }

                        //Callback with the error
                        callback(new Error(msg.error));

                    }

                    if (clusterCount === workerCount) {
                        callback();
                    }

                });
            });

        } else {
            initWorker();
        }

    });

}

function initWorker() {


    //Use this callback to notify back to the cluster master that we're started, either successfully or with error
    var callback = function(err) {
        var message = { cmd: 'startupComplete', procId : process.pid };
        if (err)
            message.error = err.message;
        process.send(message);
    }

    initServices(function(err) {
        if (err)
            return callback(err);

        initExpress(function (err) {
            callback(err);
        });
    });
}

function initServices(callback) {
    var depCalc = require('./lib/dependencyCalc');
    var serviceList = {};
    var serviceDir = path.resolve(__dirname, 'services');
    var files = fs.readdirSync(serviceDir);
    files.forEach(function(file) {
        if (path.extname(file) === '.js') {
            var mod = require(path.resolve(serviceDir, file));
            if (mod.metadata) {
                serviceList[mod.metadata.id] = mod;
                depCalc.addNode(mod.metadata.id, mod.metadata.dependencies);
            }
        }

    });

    try {
        var depGroups = depCalc.calcGroups()
    } catch (err) {
        //can fail for circular dependencies
        return callback(err);
    }

    //Now init the services in sequence
    async.eachSeries(depGroups, function(serviceIds, groupCallback) {

        async.each(serviceIds, function(serviceId, serviceCallback) {

            //Is the service already registered because it was a bootstrap service?
            if (!serviceRegistry.get(serviceId)) {
                serviceList[serviceId].init(serviceRegistry, function(err) {
                    serviceRegistry.add(serviceList[serviceId]);
                    serviceCallback(err);
                });
            } else {
                //need to callback even though we didn't init anything
                serviceCallback();
            }
        }, function(err) {
            groupCallback(err);
        });

    }, function(err) {
        callback(err);
    });

}


function initExpress(callback) {

    var configService = serviceRegistry.get('config');
    var logger = serviceRegistry.get('logger');
    var httpConf = configService.get('http');

    var app = express()

    var server = app.listen(httpConf.port, function () {
        var host = server.address().address
        var port = server.address().port

        logger.info('Server is listening at http://%s:%s', host, port);
        callback();
    }).on('error', function(err) {
        callback(err);
    });
}
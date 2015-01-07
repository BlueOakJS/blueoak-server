var path = require('path'),
    fs = require('fs'),
    _ = require('lodash'),
    async = require('async'),
    q = require('q'),
    cluster = require('cluster')

var server = module.exports;

//set the app root to the directory the main module was executed from
global.__appDir = path.normalize(path.join(process.mainModule.filename, '../'));


var serviceRegistry = {}; //map service ID to module

//Opts is optional
module.exports.init = function (opts, callback) {

    if (typeof opts === 'function') {
        callback = opts;
        opts = {};
    }

    //Load the bootstrap services first
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

            var clusterConfig = server.get('config').get('cluster');

            // Either set to maxWorkers, or if < 0, use the count of machine's CPUs
            var workerCount = clusterConfig.maxWorkers < 0 ? require('os').cpus().length : clusterConfig.maxWorkers;

            // Create a worker for each CPU
            for (var i = 0; i < workerCount; i += 1) {
                cluster.fork({decryptionKey: server.get('config').decryptionKey});
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

function initWorker() {

    //Use this callback to notify back to the cluster master that we're started, either successfully or with error
    var callback = function (err) {
        var message = {cmd: 'startupComplete', procId: process.pid};
        if (err) {
            message.error = err.message;
        }
        process.send(message);
    };

    initServices(function (err) {
        if (err) {
            return callback(err);
        }
    });
}


/**
 * Returns each of the modules in the given directory.
 *
 * It also populates the metadata ID if it doesn't exist based on the name of the file,
 * e.g. myService.js will have an id of myService.
 *
 * @param serviceDir
 * @returns {Array}
 */
function getServicesInDirectory(serviceDir) {
    var serviceList = [];
    if (fs.existsSync(serviceDir)) {
        var files = fs.readdirSync(serviceDir);
        files.forEach(function (file) {
            if (path.extname(file) === '.js') {
                var mod = require(path.resolve(serviceDir, file));

                //metadata is optional
                mod.metadata = mod.metadata || {};
                mod.metadata.id = mod.metadata.id || file.slice(0, -3);
                serviceList.push(mod);
            }
        });
    } else {
        //TODO: warn directory doesn't exist
    }
    return serviceList;
}

function getThirdPartyServices() {
    var serviceList = [];
    var otherServices = server.get('config').get('services'); //array of service module names

    for (var i = 0; i < _.keys(otherServices).length; i++) {
        var mod = require(otherServices[i]);

        //metadata is optional
        mod.metadata = mod.metadata || {};
        mod.metadata.id = mod.metadata.id || otherServices[i];
        serviceList.push(mod);
    }

    return serviceList;
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
    var depCalc = require('./lib/dependencyCalc');

    var serviceList = [];

    //built in services
    serviceList = serviceList.concat(getServicesInDirectory(path.resolve(__dirname, 'services')));

    //user services
    serviceList = serviceList.concat(getServicesInDirectory(path.resolve(global.__appDir, 'services')));

    if (!bootstrap) {
        serviceList = serviceList.concat(getThirdPartyServices());
    }

    var serviceMap = {}; //map service id to module
    //If we're bootstrapping only load bootstrap services
    //Otherwise load all services, bootstrap and non bootstrap
    serviceList.forEach(function(mod) {
        var serviceId = mod.metadata.id;
        if (!bootstrap || bootstrap === (mod.metadata.bootstrap || false)) {
            depCalc.addNode(serviceId, mod.metadata.dependencies);
            serviceMap[serviceId] = mod;
        }
    });

    var depGroups = [];
    try {
        depGroups = depCalc.calcGroups();
    } catch (err) {
        //can fail for circular dependencies
        return callback(err);
    }

    //Now init the services in sequence
    async.eachSeries(depGroups, function (serviceIds, groupCallback) {

        async.each(serviceIds, function (serviceId, serviceCallback) {

            if (!serviceRegistry[serviceId]) { //we might have already added bootstrap services, so check

                //grab config for service as long as it's not the config service
                var serviceConfig = serviceId === 'config' ? null : server.get('config').get(serviceId);

                serviceMap[serviceId].init(server, serviceConfig, function (err) {
                    addService(serviceMap[serviceId]);
                    serviceCallback(err);
                });
            } else {
                //need to callback even though we didn't init anything
                serviceCallback();
            }
        }, function (err) {
            groupCallback(err);
        });

    }, function (err) {
        callback(err);
    });

}

function addService(mod) {
    serviceRegistry[mod.metadata.id] = mod;
}

module.exports.get = function(serviceId) {
    return serviceRegistry[serviceId];
};



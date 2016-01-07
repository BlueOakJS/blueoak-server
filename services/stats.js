/* Copyright © 2015 PointSource, LLC. All rights reserved. */
var async = require('async');
var loader;

exports.init = function (serviceLoader) {
    loader = serviceLoader;
};

//Query all the services and invoke the stats method if it exists
function collectStats(callback) {
    var serviceStats = {};
    var services = loader.listServices();
    async.each(services, function(service, callback) {
        var mod = loader.get(service);
        if (mod.stats) { //does it have a stats function?
            invokeStatsOnMod(mod, function(err, data) {
                serviceStats[service] = data;
                return callback(err);
            });
        } else {
            return callback(); //nothing to do, no stats method exposed
        }

    }, function(err) {
        callback(err, serviceStats);
    });

}

function invokeStatsOnMod(mod, callback) {
    mod.stats(callback);
}

exports.getStats = function (callback) {
    collectStats(callback);
};
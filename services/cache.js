/* Copyright © 2015 PointSource, LLC. All rights reserved. */
//Provides a cache service that can support multiple underlying interfaces
//if the "type" field is set to "redis", we use a redis interface,
//otherwise we default to a node-cache interface.
exports.init = function (monitor, config) {

    var cfg = config.get('cache');

    var interface = null;
    if (cfg.type === 'redis') {
        interface = services.get('redis').cacheInterface;
    } else {
        interface = require('../lib/nodeCacheInterface');
    }

    exports.stop = function() {
        interface.stop();
    };

    exports.getClient = function () {
        return interface['getClient'].apply(interface, arguments);
    };

    exports.get = function (key, callback) {

        //callback is optional
        callback = callback || function () {};

        function cb(err, result) {
            var keyStr = (typeof key === 'string') ? key : null;
            if (err) {
                if (keyStr) {
                    monitor.increment(keyStr + '.' + 'cacheMisses', 1);
                }
                monitor.increment('cacheMisses', 1);
                callback(err);
            } else {
                if (result/*result[key]*/) {
                    if (keyStr) {
                        monitor.increment(keyStr + '.' + 'cacheHits', 1);
                    }
                    monitor.increment('cacheHits', 1);
                    return callback(null, result); //result[key]
                } else {
                    if (keyStr) {
                        monitor.increment(keyStr + '.' + 'cacheMisses', 1);
                    }
                    monitor.increment('cacheMisses', 1);
                    //If key doesn't exist, send null
                    return callback(null, null);
                }
            }
            callback(err, result);
        }

        return interface.get(key, cb);
    };

    exports.set = function (key, value, ttl, callback) {
        if (typeof ttl === 'function') {
            callback = ttl;
            ttl = undefined;
        }
        //callback is optional
        callback = callback || function () {};

        function cb(err, success) {
            var keyStr = (typeof key === 'string') ? key : null;
            if (!err && success) {
                if (keyStr) {
                    monitor.increment(keyStr + '.' + 'cacheUpdates', 1);
                }
                monitor.increment('cacheUpdates', 1);
            }
            callback(err, success);
        }

        return interface.set(key, value, ttl, cb);
    };
};

//If we're going to use redis, we can't init the cache until redis and all its dependencies have been initialized
exports.getDependencies = function (serviceLoader) {
    var cfg = serviceLoader.get('config').get('cache');
    if (cfg.type === 'redis') {
        return ['redis'];
    }
    return []; //nothing else needed for node cache
};



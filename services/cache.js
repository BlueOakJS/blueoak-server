/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
//Provides a cache service that can support multiple underlying interfaces
//if the "type" field is set to "redis", we use a redis interface,
//otherwise we default to a node-cache interface.

var _ = require('lodash');

exports.init = function (monitor, config) {

    var cfg = config.get('cache');

    var impl = null;
    if (cfg.type === 'redis') {
        impl = services.get('redis').cacheInterface;
    } else {
        cfg = config.get('node-cache');
        impl = require('../lib/nodeCacheInterface')(cfg);
    }

    exports.stop = function() {
        impl.stop();
    };

    exports.getClient = function () {
        return impl['getClient'].apply(impl, arguments);
    };

    exports.get = function (key, callback) {

        //callback is optional
        callback = callback || _.noop;

        function cb(err, result) {
            var keyStr = (_.isString(key)) ? key : null;
            if (err) {
                if (keyStr) {
                    monitor.increment(keyStr + '.' + 'cacheMisses', 1);
                }
                monitor.increment('cacheMisses', 1);
                return callback(err);
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
        }

        return impl.get(key, cb);
    };

    exports.set = function (key, value, ttl, callback) {
        if (_.isFunction(ttl)) {
            callback = ttl;
            ttl = undefined;
        }
        //callback is optional
        callback = callback || _.noop;

        function cb(err, success) {
            var keyStr = (_.isString(key)) ? key : null;
            if (!err && success) {
                if (keyStr) {
                    monitor.increment(keyStr + '.' + 'cacheUpdates', 1);
                }
                monitor.increment('cacheUpdates', 1);
            }
            callback(err, success);
        }

        return impl.set(key, value, ttl, cb);
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



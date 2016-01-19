/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
//This is a cache interface for the in-memory node cache.
//The point of an interface is to provide a common set of methods that the cache service
//can call regardless of the underlying implementation.
//The redis service implements the same interface.
var NodeCache = require('node-cache');
var client = null;

module.exports = function(cfg) {
    client = new NodeCache(cfg);

    return {
        //node cache can return the value directly rather than using a callback
        get: function (key, callback) {
            return client.get(key, function (err, result) {
                return callback(err, result);
            });
        },

        //myCache.set( key, val, [ ttl ], [callback] )
        set: function (key, val, ttl, callback) {
            //ttl is optional
            if (typeof ttl === 'function') {
                callback = ttl;
                ttl = undefined;
            }

            //callback is optional
            callback = callback || function () {
            };
            client.set(key, val, ttl, callback);
        },

        stop: function () {
            client.close(); //kills the timer that checks for invalidation
        },

        getClient: function () {
            return client;
        }
    }

};

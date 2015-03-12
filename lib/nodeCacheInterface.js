//This is a cache interface for the in-memory node cache.
//The point of an interface is to provide a common set of methods that the cache service
//can call regardless of the underlying implementation.
//The redis service implements the same interface.
var NodeCache = require("node-cache");
var client = new NodeCache();

module.exports = {
    get: function (key, callback) {
        //node cache behaves a little differently than redis.
        //If we request key 'foo', we get back and object containing the key
        //e.g. {foo: {...}}.  If foo doesn't exist we just get back {}
        client.get(key, function (err, result) {
            if (err) {
                callback(err);
            } else {
                if (result[key]) {
                    return callback(null, result[key]);
                } else {
                    //If key doesn't exist, send null
                    return callback(null, null);
                }
            }
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

    stop: function() {
        //there's a timer in the node cache that checks for expirations
        //we can kill it by setting checkperiod to 0 and flushing
        client.options.checkperiod = 0;
        client.flushAll();
    },

    getClient: function () {
        return client;
    }

};

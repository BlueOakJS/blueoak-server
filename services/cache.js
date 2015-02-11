var NodeCache = require( "node-cache" );
var interface = null;

exports.init = function (logger, config) {
    var cfg = config.get('cache');
    if (cfg.type === 'redis') {
        interface = services.get('redis').cacheInterface;
    } else {
        var client = new NodeCache();
        interface = nodeCacheInterface(client);
    }

    //now we want to export the functions on the interface
    var methodsToExpose = ['get', 'set', 'getClient'];
    methodsToExpose.forEach(function(method) {
        exports[method] = function() {
            return interface[method].apply(interface, arguments);
        };
    });
};

//If we're going to use redis, we can't init the cache until redis and all its dependencies have been initialized
exports.getDependencies = function(serviceLoader) {
    var cfg = serviceLoader.get('config').get('cache');
    if (cfg.type === 'redis') {
        return ['redis'];
    }
    return []; //nothing else needed for node cache
};


var nodeCacheInterface = function (client) {
    return {
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
            callback = callback || function() {};
            client.set(key, val, ttl, callback);
        },

        getClient: function() {
            return client;
        }

    };
};
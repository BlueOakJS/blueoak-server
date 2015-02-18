var NodeCache = require( "node-cache" );
var interface = null;
var _monitor = null;
var _logger = null;
exports.init = function (logger, monitor, config) {
    _monitor = monitor;
    _logger = logger;
    var cfg = config.get('cache');
    if (cfg.type === 'redis') {
        interface = services.get('redis').cacheInterface;
    } else {
        var client = new NodeCache();
        interface = nodeCacheInterface(client);
    }

    //now we want to export the functions on the interface
    //var methodsToExpose = ['get', 'set', 'getClient'];
    //methodsToExpose.forEach(function(method) {
    //    exports[method] = function() {
    //        return interface[method].apply(interface, arguments);
    //    };
    //});
    exports.getClient = function() {
      return interface['getClient'].apply(interface, arguments);
    }

    exports.get = function(key, callback) {

        //callback is optional
        callback = callback || function() {};

        function cb(err, result) {
            var keyStr = (typeof key === 'string')?key:null;
            if (err) {
                if(keyStr) {
                    _monitor.increment(keyStr + '.' + 'cacheMisses',1);
                }
                _monitor.increment('cacheMisses', 1);
                callback(err);
            } else {
                if (result/*result[key]*/) {
                    if(keyStr) {
                        _monitor.increment(keyStr + '.' + 'cacheHits',1);
                    }
                    _monitor.increment('cacheHits', 1);
                    return callback(null, result); //result[key]
                } else {
                    if(keyStr) {
                        _monitor.increment(keyStr + '.' + 'cacheMisses',1);
                    }
                    _monitor.increment('cacheMisses', 1);
                    //If key doesn't exist, send null
                    return callback(null, null);
                }
            }
            callback(err,success);
        }

        return interface.get(key, cb);
    }

    exports.set = function(key, value, ttl, callback) {
        if(typeof ttl === 'function') {
          callback = ttl;
          ttl = undefined;
        }
        //callback is optional
        callback = callback || function() {};
        function cb(err, success) {
            var keyStr = (typeof key === 'string')?key:null;
            if(!err && success) {
                if(keyStr) {
                    _monitor.increment(keyStr + '.' + 'cacheUpdates',1);
                }
                _monitor.increment('cacheUpdates',1);
            }
            callback(err,success);
        }
        if(cfg.type == 'redis') {
          return interface.set(key,value,cb);
        } else {
          return interface.set(key,value,ttl,cb);
        }
    }
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
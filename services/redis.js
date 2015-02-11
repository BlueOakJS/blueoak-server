var redis = require('redis');

var client = null;

exports.init = function (logger, config, callback) {
    var cfg = config.get('redis');

    if (cfg.host && cfg.port) {
        logger.info('Redis service is enabled');
    } else {
        return callback();
    }

    client = redis.createClient(cfg.port, cfg.host, cfg.options);
    client.on('error', function (err) {
        client.end();
        return callback(err);
    });


    client.on('connect', function () {
        logger.info('Connected to redis on %s:%s',  cfg.host, cfg.port);
        callback();
    });

};

exports.cacheInterface = {

    get: function(key, callback) {
        client.get(key, function(err, result) {
            if (err) {
                callback(err);
            } else {
                callback(null, JSON.parse(result));
            }
        });
    },

    set: function(key, val, ttl, callback) {
        //ttl is optional
        if (typeof ttl === 'function') {
            callback = ttl;
            ttl = undefined;
        }

        //callback is optional
        callback = callback || function() {};

        //redis doesn't handle JSON data, so stringify it ourselves
        val = JSON.stringify(val);
        client.set(key, val, function() {
            if (ttl) {
                //we also have to explicitly set the expiration in a separate call
                client.expire(key, ttl, function () {
                    callback();
                });
            } else {
                callback();
            }
        });
    },

    getClient: function() {
        return client;
    }

};

exports.getClient = function() {
    return client;
};

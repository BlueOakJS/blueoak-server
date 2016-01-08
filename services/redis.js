/* Copyright © 2015 PointSource, LLC. All rights reserved. */
var redis = require('redis');

var client = null;

exports.init = function (logger, config, callback) {

    var cfg = config.get('redis');

    if (cfg.host && cfg.port) {
        logger.info('Redis service is enabled');
    } else if (config.get('cache').type === 'redis') {
        //TODO: Should probably have a way to fail if someone is accessing the redis service directly
        //with config is missing, vs accessing it through cache service
        return callback(new Error('Must specify host and port for Redis'));
    } else {
        return callback();
    }

    var reconnecting = false; //becomes true if we're attempting to reconnect
    client = redis.createClient(cfg.port, cfg.host, cfg.options);
    client.on('error', function (err) {
        //this gets called on every failed connect attempt

        if (callback) {
            client.end(); //stop trying to reconnect during server startup
            return callback(err);
        }
    });

    client.on('reconnecting', function (data) {
        if (!reconnecting) { //ensures message only logged once
            logger.error('Disconnected from redis.');
            reconnecting = true;
        }
        logger.debug("Reconnecting to redis, attempt #%s", data.attempt);
    });

    client.on('connect', function () {
        reconnecting = false;
        if (!callback) {
            //must be reconnected, ignore
            logger.info('Reconnected to redis');
            return;
        }

        logger.info('Connected to redis on %s:%s',  cfg.host, cfg.port);
        var originCallback = callback;
        callback = null; //make sure it's not called if we disconnect
        return originCallback();
    });
};


exports.cacheInterface = {

    get: function(key, callback) {
        client.get(key, function(err, result) {
            if (err) {
                return callback(err);
            } else {
                return callback(null, JSON.parse(result));
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
                return callback();
            }
        });
    },

    stop: function() {
        client.quit();
    },

    getClient: function() {
        return client;
    }

};

exports.getClient = function() {
    return client;
};

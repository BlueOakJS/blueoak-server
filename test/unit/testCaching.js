var assert = require("assert"),
    path = require('path'),
    redis = require('../../services/redis'),
    cache = require('../../services/cache'),
    util = require('./util');

var logger = {
    info: function() {
    }
};


function getConfigService(cfg) {
    return {
        get: function(id) {
            return cfg[id] || {};
        }
    };
}

describe('Redis Test', function () {


    beforeEach(function () {

    });

    afterEach(function () {

    });

    it('If host and port config is undefined, redis client will be null', function (done) {
        var config = getConfigService({});
        util.initService(redis, {}, function() {
            assert.equal(redis.getClient(), null);
            done();
        });
    });

    it('If host and port config is defined, redis client will be defined', function (done) {
        util.initService(redis, {redis: {host: 'localhost', port: 6379}}, function() {
            assert.ok(redis.getClient())
            done();
        });

    });

});

describe('Cache test', function () {

    var redisRunning = true;

    beforeEach(function (done) {
        services = {
            get: function(id) {
                if (id === 'redis') {
                    return redis;
                }

            }
        };

        util.initService(redis, {redis: {host: 'localhost', port: 6379}}, function(err) {
            if (err) {
                redisRunning = false;
            }
            done();
        });
    });

    afterEach(function () {
        services = null;
    });


    it('Should be able to store single strings in the redis cache', function (done) {
        if (!redisRunning) {
            console.warn('Redis is not running--skipping');
            return done();
        }

        util.initService(cache, {cache: {type: 'redis'}}, function(err) {
            cache.set('foo', 'bar', function() {
                cache.get('foo', function(err, result) {
                    assert.equal(result, 'bar');
                    done();
                });
            });
        });

    });

    it('Should be able to store single numbers in the redis cache', function (done) {
        if (!redisRunning) {
            console.warn('Redis is not running--skipping');
            return done();
        }

        util.initService(cache, {cache: {type: 'redis'}}, function() {
            cache.set('foo', 5, function () {
                cache.get('foo', function (err, result) {
                    assert.equal(result, 5);
                    done();
                });
            });
        });
    });

    it('Should be able to store null in the redis cache', function (done) {
        if (!redisRunning) {
            console.warn('Redis is not running--skipping');
            return done();
        }

        util.initService(cache, {cache: {type: 'redis'}}, function() {
            cache.set('foo', null, function() {
                cache.get('foo', function(err, result) {
                    assert.equal(result, null);
                    done();
                });
            });
        });

    });

    it('Should be able to store objects in the redis cache', function (done) {
        if (!redisRunning) {
            console.warn('Redis is not running--skipping');
            return done();
        }

        util.initService(cache, {cache: {type: 'redis'}}, function() {
            cache.set('foo', {hello: 'world'}, function() {
                cache.get('foo', function(err, result) {
                    assert.equal(result.hello, 'world');
                    done();
                });
            });
        });

    });

    it('Should be able to store single strings in the node cache', function (done) {
        util.initService(cache, {}, function() {
            cache.set('foo', 'bar', function () {
                cache.get('foo', function (err, result) {
                    assert.equal(result, 'bar');
                    done();
                });
            });
        });
    });

    it('Should be able to store single numbers in the node cache', function (done) {
        util.initService(cache, {}, function() {
            cache.set('foo', 5, function () {
                cache.get('foo', function (err, result) {
                    assert.equal(result, 5);
                    done();
                });
            });
        });
    });

    it('Should be able to store null in the node cache', function (done) {
        util.initService(cache, {}, function() {
            cache.set('foo', null, function () {
                cache.get('foo', function (err, result) {
                    assert.equal(result, null);
                    done();
                });
            });
        });
    });

    it('Should be able to store objects in the node cache', function (done) {
        util.initService(cache, {}, function() {
            cache.set('foo', {hello: 'world'}, function () {
                cache.get('foo', function (err, result) {
                    assert.equal(result.hello, 'world');
                    done();
                });
            });
        });
    });

});
/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var assert = require('assert'),
    redis = require('../../services/redis'),
    cache = require('../../services/cache'),
    util = require('../../testlib/util');

describe('Redis Test', function () {

    it('If host and port config is undefined, redis client will be null', function (done) {
        util.initService(redis, {}, function() {
            assert.equal(redis.getClient(), null);
            done();
        });
    });

    it('If host and port config is defined, redis client will be defined', function (done) {
        util.initService(redis, {redis: {host: 'localhost', port: 6379}}, function() {
            assert.ok(redis.getClient());
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

    it('If type is redis, we should get a redis interface', function (done) {
        util.initService(cache, {cache: {type: 'redis'}}, function(err) {
            assert.equal(cache.getClient(), redis.getClient());
            done(err);
        });
    });

    it('If type is not redis, we should not get a redis interface', function (done) {
        util.initService(cache, {cache: {type: 'blah'}}, function(err) {
            assert.ok(cache.getClient() !== redis.getClient());
            done(err);
        });
    });

    it('Should be able to store single strings in the redis cache', function (done) {
        if (!redisRunning) {
            console.warn('Redis is not running--skipping');
            return done();
        }

        util.initService(cache, {cache: {type: 'redis'}}, function(err1) {
            cache.set('foo', 'bar', function() {
                cache.get('foo', function(err2, result) {
                    assert.equal(result, 'bar');
                    done(err1 || err2);
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
                    done(err);
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
                    done(err);
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
                    done(err);
                });
            });
        });

    });

    it('Setting a ttl should cause expiration in redis cache', function (done) {
        this.timeout(3000);
        if (!redisRunning) {
            console.warn('Redis is not running--skipping');
            return done();
        }

        util.initService(cache, {cache: {type: 'redis'}}, function() {
            cache.set('foo', 'bar', 2, function() { //2 seconds
                setTimeout(function() {
                    cache.get('foo', function(err, result) {
                        assert.equal(result, null);
                        done(err);
                    });
                }, 2500);
            });
        });
    });

    it('Setting a large ttl will prevent expiration in redis cache', function (done) {
        this.timeout(3000);
        if (!redisRunning) {
            console.warn('Redis is not running--skipping');
            return done();
        }

        util.initService(cache, {cache: {type: 'redis'}}, function() {
            cache.set('foo', 'bar', 3, function() { //3 sec
                setTimeout(function() {
                    cache.get('foo', function(err, result) {
                        assert.equal(result, 'bar');
                        done(err);
                    });
                }, 2500); //not enough time to cause expiration
            });
        });
    });


    it('Should be able to store single strings in the node cache', function (done) {
        util.initService(cache, {}, function() {
            cache.set('foo', 'bar', function () {
                cache.get('foo', function (err, result) {
                    assert.equal(result, 'bar');
                    done(err);
                });
            });
        });
    });

    it('Should be able to store single numbers in the node cache', function (done) {
        util.initService(cache, {}, function() {
            cache.set('foo', 5, function () {
                cache.get('foo', function (err, result) {
                    assert.equal(result, 5);
                    done(err);
                });
            });
        });
    });

    it('Should be able to store null in the node cache', function (done) {
        util.initService(cache, {}, function() {
            cache.set('foo', null, function () {
                cache.get('foo', function (err, result) {
                    assert.equal(result, null);
                    done(err);
                });
            });
        });
    });

    it('Should be able to store objects in the node cache', function (done) {
        util.initService(cache, {}, function() {
            cache.set('foo', {hello: 'world'}, function () {
                cache.get('foo', function (err, result) {
                    assert.equal(result.hello, 'world');
                    done(err);
                });
            });
        });
    });

    it('Setting a ttl should cause expiration in node cache', function (done) {
        this.timeout(3000);

        util.initService(cache, {}, function() {
            cache.set('foo', 'bar', 2, function() { //2 seconds
                setTimeout(function() {
                    cache.get('foo', function(err, result) {
                        assert.equal(result, null);
                        done(err);
                    });
                }, 2500);
            });
        });
    });

    it('Setting a large ttl will prevent expiration in node cache', function (done) {
        this.timeout(3000);

        util.initService(cache, {}, function() {
            cache.set('foo', 'bar', 3, function() { //3 sec
                setTimeout(function() {
                    cache.get('foo', function(err, result) {
                        assert.equal(result, 'bar');
                        done(err);
                    });
                }, 2500); //not enough time to cause expiration
            });
        });
    });

});

/* Copyright © 2015 PointSource, LLC. All rights reserved. */
var path = require('path'),
    request = require('request'),
    assert = require('assert'),
    util = require('./launchUtil');

describe('SERVER5 - test simple REST calls from swagger spec', function () {
    this.timeout(5000);
    before(function (done) {
        util.launch('server5', done);
    });

    after(function (done) {
        util.finish(done);
    });

    it('GET /api/pets1', function (done) {
        request('http://localhost:' + (process.env.PORT || 5000) + '/api/pets1', function(err, resp, body) {
            assert.ok(!err)
            var json = JSON.parse(body);
            assert.equal('pets1', json.name);
            done();
        });
    });
    
    //override handler using x-handler
    it('GET /api/pets2', function (done) {
        request('http://localhost:' + (process.env.PORT || 5000) + '/api/pets2', function(err, resp, body) {
            assert.ok(!err)
            var json = JSON.parse(body);
            assert.equal('pets2', json.name);
            done();
        });
    });
    
    //override middleware using x-middleware
    it('GET /api/pets3', function (done) {
        request('http://localhost:' + (process.env.PORT || 5000) + '/api/pets3', function(err, resp, body) {
            assert.ok(!err)
            var json = JSON.parse(body);
            assert.equal('pets3', json.name);
            done();
        });
    });
    
    //override middleware using x-middleware array
    it('GET /api/pets4', function (done) {
        request('http://localhost:' + (process.env.PORT || 5000) + '/api/pets4', function(err, resp, body) {
            assert.ok(!err)
            var json = JSON.parse(body);
            assert.equal('pets4', json.name);
            done();
        });
    });
    
    //override middleware using x-middleware with custom handler name
    it('GET /api/pets5', function (done) {
        request('http://localhost:' + (process.env.PORT || 5000) + '/api/pets5', function(err, resp, body) {
            assert.ok(!err)
            var json = JSON.parse(body);
            assert.equal('pets5', json.name);
            done();
        });
    });

});

describe('SERVER7 - test simple REST calls from yaml-based swagger spec', function () {
    this.timeout(5000);
    before(function (done) {
        util.launch('server7', done);
    });

    after(function (done) {
        util.finish(done);
    });

    it('GET /v2/pet/1', function (done) {
        request('http://localhost:' + (process.env.PORT || 5000) + '/v2/pet/1', function (err, resp, body) {
            assert.ok(!err)
            var json = JSON.parse(body);
            assert.equal('pets1', json.name);
            done();
        });
    });

    //foo is defined in a yaml containing references
    it('GET /foo', function (done) {
        request('http://localhost:' + (process.env.PORT || 5000) + '/foo', function (err, resp, body) {
            assert.ok(!err)
            var json = JSON.parse(body);
            assert.equal('foo', json.name);
            done();
        });
    });
})
/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var request = require('request'),
    assert = require('assert'),
    util = require('./launchUtil');

describe('SERVER1 - test simple REST calls', function () {
    this.timeout(5000);

    before(function (done) {
        util.launch('server1', done);
    });

    after(function (done) {
        util.finish(done);
    });

    it('GET /endpoint1', function (done) {
        request('http://localhost:' + (process.env.PORT || 5000) + '/endpoint1', function(err, resp, body) {
            assert.equal(null, err);
            var json = JSON.parse(body);
            assert.equal('endpoint1', json.name);
            done();
        });
    });

    it('POST /endpoint1', function (done) {
        request.post('http://localhost:' + (process.env.PORT || 5000) + '/endpoint1', function(err, resp, body) {
            assert.equal(null, err);
            var json = JSON.parse(body);
            assert.equal('endpoint1', json.name);
            done();
        });
    });

    it('PUT /endpoint1', function (done) {
        request.put('http://localhost:' + (process.env.PORT || 5000) + '/endpoint1', function(err, resp, body) {
            assert.equal(null, err);
            var json = JSON.parse(body);
            assert.equal('endpoint1', json.name);
            done();
        });
    });

    it('DELETE /endpoint1', function (done) {
        request.del('http://localhost:' + (process.env.PORT || 5000) + '/endpoint1', function(err, resp, body) {
            assert.equal(null, err);
            var json = JSON.parse(body);
            assert.equal('endpoint1', json.name);
            done();
        });
    });

});
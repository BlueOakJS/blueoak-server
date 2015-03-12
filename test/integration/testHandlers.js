var sprout = require('../../index'),
    path = require('path'),
    request = require('request'),
    assert = require('assert');

describe('SERVER1 - test simple REST calls', function () {

    before(function (done) {
        sprout.init({
            appDir: path.resolve(process.cwd(), 'test/integration/fixtures/server1')
        }, function(err) {
            done(err);
        });
    });

    after(function () {
        sprout.stop();
    });

    it('GET /endpoint1', function (done) {
        request('http://localhost:5000/endpoint1', function(err, resp, body) {
            assert.ok(!err)
            var json = JSON.parse(body);
            assert.equal('endpoint1', json.name);
            done();
        });
    });

    it('POST /endpoint1', function (done) {
        request.post('http://localhost:5000/endpoint1', function(err, resp, body) {
            assert.ok(!err)
            var json = JSON.parse(body);
            assert.equal('endpoint1', json.name);
            done();
        });
    });

    it('PUT /endpoint1', function (done) {
        request.put('http://localhost:5000/endpoint1', function(err, resp, body) {
            assert.ok(!err)
            var json = JSON.parse(body);
            assert.equal('endpoint1', json.name);
            done();
        });
    });

    it('DELETE /endpoint1', function (done) {
        request.del('http://localhost:5000/endpoint1', function(err, resp, body) {
            assert.ok(!err)
            var json = JSON.parse(body);
            assert.equal('endpoint1', json.name);
            done();
        });
    });

});
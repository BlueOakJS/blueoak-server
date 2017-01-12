var request = require('request'),
    assert = require('assert'),
    util = require('./launchUtil');

describe('test basic auth', function () {
    this.timeout(5000);
    before(function (done) {
        util.launch('serverAuth', done);
    });

    after(function (done) {
        util.finish(done);
    });

    it('should fail without credentials', function (done) {
        request('http://localhost:' + (process.env.PORT || 5000) + '/api/v1/superfuntime/2',
            function (err, resp, body) {
                assert.ifError(err);
                assert.equal(resp.statusCode, 401);
                assert.ok(resp.headers['www-authenticate'].indexOf('Basic') >= 0);
                done();
            });
    });

    it('should succeed with credentials', function (done) {
        request.get('http://localhost:' + (process.env.PORT || 5000) + '/api/v1/superfuntime/2',
            {
                auth: {
                    user: 'username', pass: 'password', sendImmediately: false
                }
            },
            function (err, resp, body) {
                assert.ifError(err);
                assert.equal(resp.statusCode, 200);
                done();
            });
    });
});

describe('test apiKey auth', function () {
    this.timeout(5000);
    before(function (done) {
        util.launch('serverAuth', done);
    });

    after(function (done) {
        util.finish(done);
    });

    it('should fail without credentials', function (done) {
        request.post('http://localhost:' + (process.env.PORT || 5000) + '/api/v1/superfuntime/2',
            {
                body: {
                    'kind': 'OtherPerson',
                    'curiousPersonReqField': 'hey?',
                    'enthusiasticPersonReqField': 'hola!'
                },
                json: true
            },
            function (err, resp, body) {
                assert.ifError(err);
                assert.equal(resp.statusCode, 401);
                done();
            });
    });

    it('should succeed with credentials', function (done) {
        request.post('http://localhost:' + (process.env.PORT || 5000) + '/api/v1/superfuntime/2',
            {
                body: {
                    'kind': 'OtherPerson',
                    'curiousPersonReqField': 'hey?',
                    'enthusiasticPersonReqField': 'hola!'
                },
                json: true,
                headers: {
                    'x-key': 'api secret key'
                }
            },
            function (err, resp, body) {
                assert.ifError(err);
                assert.equal(resp.statusCode, 204);
                done();
            });
    });
});

describe('test basic and apiKey auth together on same operation', function () {
    this.timeout(5000);
    before(function (done) {
        util.launch('serverAuth', done);
    });

    after(function (done) {
        util.finish(done);
    });

    it('should fail without any credentials', function (done) {
        request.delete('http://localhost:' + (process.env.PORT || 5000) + '/api/v1/superfuntime/2',
            function (err, resp, body) {
                assert.ifError(err);
                assert.equal(resp.statusCode, 401);
                done();
            });
    });

    it('should fail without basic credentials', function (done) {
        request.delete('http://localhost:' + (process.env.PORT || 5000) + '/api/v1/superfuntime/2',
            {
                headers: {
                    'x-key': 'api secret key'
                }
            },
            function (err, resp, body) {
                assert.ifError(err);
                assert.equal(resp.statusCode, 401);
                done();
            });
    });

    it('should fail without apiKey credentials', function (done) {
        request.delete('http://localhost:' + (process.env.PORT || 5000) + '/api/v1/superfuntime/2',
            {
                auth: {
                    user: 'username', pass: 'password', sendImmediately: false
                }
            },
            function (err, resp, body) {
                assert.ifError(err);
                assert.equal(resp.statusCode, 401);
                done();
            });
    });

    it('should succeed with credentials', function (done) {
        request.delete('http://localhost:' + (process.env.PORT || 5000) + '/api/v1/superfuntime/2',
            {
                auth: {
                    user: 'username', pass: 'password', sendImmediately: false
                },
                headers: {
                    'x-key': 'api secret key'
                }
            },
            function (err, resp, body) {
                assert.ifError(err);
                assert.equal(resp.statusCode, 204);
                done();
            });
    });
});


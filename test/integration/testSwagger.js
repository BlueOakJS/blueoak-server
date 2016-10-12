/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var request = require('request'),
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
        request('http://localhost:' + (process.env.PORT || 5000) + '/api/pets1', function (err, resp, body) {
            assert.equal(null, err);
            var json = JSON.parse(body);
            assert.equal('pets1', json.name);
            done();
        });
    });

    //override handler using x-handler
    it('GET /api/pets2', function (done) {
        request('http://localhost:' + (process.env.PORT || 5000) + '/api/pets2', function (err, resp, body) {
            assert.equal(null, err);
            var json = JSON.parse(body);
            assert.equal('pets2', json.name);
            done();
        });
    });

    //override middleware using x-middleware
    it('GET /api/pets3', function (done) {
        request('http://localhost:' + (process.env.PORT || 5000) + '/api/pets3', function (err, resp, body) {
            assert.equal(null, err);
            var json = JSON.parse(body);
            assert.equal('pets3', json.name);
            done();
        });
    });

    //override middleware using x-middleware array
    it('GET /api/pets4', function (done) {
        request('http://localhost:' + (process.env.PORT || 5000) + '/api/pets4', function (err, resp, body) {
            assert.equal(null, err);
            var json = JSON.parse(body);
            assert.equal('pets4', json.name);
            done();
        });
    });

    //override middleware using x-middleware with custom handler name
    it('GET /api/pets5', function (done) {
        request('http://localhost:' + (process.env.PORT || 5000) + '/api/pets5', function (err, resp, body) {
            assert.equal(null, err);
            var json = JSON.parse(body);
            assert.equal('pets5', json.name);
            done();
        });
    });

    it('GET spec from /swagger/petstore', function (done) {
        request('http://localhost:' + (process.env.PORT || 5000) + '/swagger/petstore', function (err, resp, body) {
            assert.equal(null, err);
            var json = JSON.parse(body);
            assert.equal('localhost:5000', json.host);
            done();
        });
    });

});

//This is the same as SERVER5 except we're running with a blueoak project structure
//i.e. swagger is in ../common/swagger instead of <server>/swagger
describe('SERVER8 - test swagger spec with blueoak project structure', function () {
    this.timeout(5000);
    before(function (done) {
        util.launch('server8/server', done);
    });

    after(function (done) {
        util.finish(done);
    });

    it('GET /api/pets1', function (done) {
        request('http://localhost:' + (process.env.PORT || 5000) + '/api/pets1', function (err, resp, body) {
            assert.equal(null, err);
            var json = JSON.parse(body);
            assert.equal('pets1', json.name);
            done();
        });
    });

    //override handler using x-handler
    it('GET /api/pets2', function (done) {
        request('http://localhost:' + (process.env.PORT || 5000) + '/api/pets2', function (err, resp, body) {
            assert.equal(null, err);
            var json = JSON.parse(body);
            assert.equal('pets2', json.name);
            done();
        });
    });

    //override middleware using x-middleware
    it('GET /api/pets3', function (done) {
        request('http://localhost:' + (process.env.PORT || 5000) + '/api/pets3', function (err, resp, body) {
            assert.equal(null, err);
            var json = JSON.parse(body);
            assert.equal('pets3', json.name);
            done();
        });
    });

    //override middleware using x-middleware array
    it('GET /api/pets4', function (done) {
        request('http://localhost:' + (process.env.PORT || 5000) + '/api/pets4', function (err, resp, body) {
            assert.equal(null, err);
            var json = JSON.parse(body);
            assert.equal('pets4', json.name);
            done();
        });
    });

    //override middleware using x-middleware with custom handler name
    it('GET /api/pets5', function (done) {
        request('http://localhost:' + (process.env.PORT || 5000) + '/api/pets5', function (err, resp, body) {
            assert.equal(null, err);
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
            assert.equal(null, err);
            var json = JSON.parse(body);
            assert.equal('pets1', json.name);
            done();
        });
    });

    //foo is defined in a yaml containing references
    it('GET /foo', function (done) {
        request('http://localhost:' + (process.env.PORT || 5000) + '/foo', function (err, resp, body) {
            assert.equal(null, err);
            var json = JSON.parse(body);
            assert.equal('foo', json.name);
            done();
        });
    });
});

describe('SERVER5 - request model validation', function () {
    this.timeout(5000);
    before(function (done) {
        util.launch('server5', done);
    });

    after(function (done) {
        util.finish(done);
    });

    it('POST /api/pets2 - invalid model', function (done) {
        request({
            method: 'POST',
            url: 'http://localhost:' + (process.env.PORT || 5000) + '/api/pets2',
            json: true,
            body: {
                name: 'Buddy'
            }
        }, function (err, resp, body) {
            assert.equal(null, err);
            assert.deepEqual(body, {
                'message': 'Error validating request body',
                'status': 422,
                'type': 'ValidationError',
                'validation_errors': [
                    {
                        'field': '',
                        'message': 'Missing required property: id',
                        'schemaPath': '/required/0'
                    }
                ]
            });
            done();
        });
    });

    it('POST /api/pets2 - valid model', function (done) {
        var model = {
            name: 'Buddy Holly',
            id: 19590203
        };
        request({
            method: 'POST',
            url: 'http://localhost:' + (process.env.PORT || 5000) + '/api/pets2',
            json: true,
            body: model
        }, function (err, resp, body) {
            assert.equal(null, err);
            assert.deepEqual(body, model);
            done();
        });
    });
});

describe('SERVER5 + default values set on request', function () {
    this.timeout(5000);
    before(function (done) {
        util.launch('server5', done);
    });

    after(function (done) {
        util.finish(done);
    });
    it('GET /api/pets6 - should contain false default values', function (done) {
        request({
            method: 'GET',
            url: 'http://localhost:' + (process.env.PORT || 5000) + '/api/pets6',
            json: true
        }, function (err, resp, body) {
            assert.equal(null, err);
            assert.equal(body.isFurry, false);
            assert.equal(body.isVaccinated, false);
            done();
        });
    });
});


describe('SERVER5 + response model validation - using the "error" option', function () {
    this.timeout(5000);

    before(function (done) {
        process.env.NODE_ENV = 'test-response-validation-errors';
        util.launch('server5', { env: process.env }, done);
    });

    after(function (done) {
        util.finish(done);
        process.env.NODE_ENV = undefined;
    });

    it('GET /api/pets1 - no validation error', function (done) {
        request('http://localhost:' + (process.env.PORT || 5000) + '/api/pets1', function (err, resp, body) {
            assert.equal(null, err);
            var json = JSON.parse(body);
            assert.equal(json.name, 'pets1');
            assert.equal(json.id, 1);
            assert.equal(json._response_validation_errors, undefined);
            done();
        });
    });

    it('GET /api/pets2 - validation error', function (done) {
        request('http://localhost:' + (process.env.PORT || 5000) + '/api/pets2', function (err, resp, body) {
            assert.equal(null, err);
            var json = JSON.parse(body);
            assert.equal(json.name, 'pets2');
            assert.equal(json.id, undefined);
            assert.deepEqual(json._response_validation_errors, {
                'message': 'Error validating response body for GET /api/pets2 with status code 200',
                'status': 522,
                'type': 'ValidationError',
                'validation_errors': [
                    {
                        'field': '/id',
                        'schemaPath': '/required/0',
                        'message': 'Missing required property: id'
                    }
                ]
            });
            done();
        });
    });
});

describe('SERVER11 + response model validation - using the "fail" option', function () {
    this.timeout(5000);

    before(function (done) {
        util.launch('server11', done);
    });

    after(function (done) {
        util.finish(done);
    });

    it('GET /api/pets1 - no validation error', function (done) {
        request('http://localhost:' + (process.env.PORT || 5000) + '/api/pets1', function (err, resp, body) {
            assert.equal(null, err);
            var json = JSON.parse(body);
            assert.equal(json.name, 'pets1');
            assert.equal(json.id, 1);
            done();
        });
    });

    it('GET /api/pets2 - validation error', function (done) {
        request('http://localhost:' + (process.env.PORT || 5000) + '/api/pets2', function (err, resp, body) {
            assert.equal(null, err);
            var json = JSON.parse(body);
            assert.equal(resp.statusCode, 522);
            assert.deepEqual(json, {
                'message': 'Error validating response body for GET /api/pets2 with status code 200',
                'status': 522,
                'type': 'ValidationError',
                'validation_errors': [
                    {
                        'message': 'Missing required property: id',
                        'field': '/id',
                        'schemaPath': '/required/0'
                    }
                ],
                'invalidResponse': {
                    'body': {
                        'name': 'pets2'
                    },
                    'method': 'GET',
                    'path': '/api/pets2',
                    'statusCode': 200
                }
            });
            done();
        });
    });
});

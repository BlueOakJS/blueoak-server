/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var request = require('request'),
    assert = require('assert'),
    util = require('./launchUtil'),
    path = require('path');

describe('SERVER6 - duplicate service name should fail on startup', function () {
    this.timeout(5000);

    after(function (done) {
        util.finish(done);
    });

    it('Launch server and check for failure', function (done) {
        util.launch('server6', function(output) {
            assert.ok(output.indexOf('already exists') > -1);
            done();
        });
    });
});

describe('SERVER9 - service module with invalid name should fail on startup', function () {
    this.timeout(5000);

    after(function (done) {
        util.finish(done);
    });

    it('Launch server and check for failure', function (done) {
        util.launch('server9', function(output) {
            assert.ok(output.indexOf('Names cannot contain periods') > -1);
            done();
        });
    });
});

describe('SERVER10 - handler with invalid name should fail on startup', function () {
    this.timeout(5000);

    after(function (done) {
        util.finish(done);
    });

    it('Launch server and check for failure', function (done) {
        util.launch('server10', function(output) {
            assert.ok(output.indexOf('Names cannot contain periods') > -1);
            done();
        });
    });
});

describe('SERVER10 - handler with invalid name should fail on startup', function () {
    this.timeout(5000);

    after(function (done) {
        util.finish(done);
    });

    it('Launch server and check for failure', function (done) {
        util.launch('server10', function(output) {
            assert.ok(output.indexOf('Names cannot contain periods') > -1);
            done();
        });
    });
});

describe('SERVER11 - middleware should get loaded from node modules', function () {
    this.timeout(5000);

    after(function (done) {
        util.finish(done);
    });

    it('Launch server and load middleware', function (done) {
        util.launch('server11', {appDir: path.resolve(__dirname, 'fixtures/server11')}, function(output) {
            assert.ok(output === null);
            done();
        });
    });
});

describe('SERVER12 - mock services should get loaded when specified by the --mock-services CLI argument', function () {
    this.timeout(5000);

    before(function (done) {
        util.launch('server12',
            {
                appDir: path.resolve(__dirname, 'fixtures/server12'),
                mockServices: 'pet-service'
            },
            done
        );
    });

    after(function (done) {
        util.finish(done);
    });

    it('Launch server and load mocks', function (done) {
        request('http://localhost:' + (process.env.PORT || 5000) + '/api/pets', function(err, resp, body) {
            assert.equal(null, err);
            var json = JSON.parse(body);
            assert.equal('mock pet', json.name);
            done();
        });
    });
});

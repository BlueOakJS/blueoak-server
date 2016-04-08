/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var assert = require('assert'),
    util = require('./launchUtil');

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
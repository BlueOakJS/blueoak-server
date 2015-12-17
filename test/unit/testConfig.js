/* Copyright © 2015 PointSource, LLC. All rights reserved. */
var assert = require("assert"),
    path = require('path'),
    util = require('../../testlib/util'),
    _ = require('lodash'),
    config = require('../../services/config'),
    sinon = require('sinon');


var origAppDir = global.__appDir;

describe('Config test', function () {

    //The logger will try to read global.__appDir, so make sure it's set
    beforeEach(function() {
        global.__appDir = path.resolve(__dirname, 'fixtures/config');
    });

    //restore __appDir to its original value
    afterEach(function() {
        global.__appDir = origAppDir;
    });

    it('Test config load order', function (done) {

        util.init(config, {}, function(services) {

        }, function() {
            assert.equal(config.get('express').port, 3001); //default.json overrides the built-in default of 3000
            assert.equal(config.get('monitor').port, 8125); //use the server default

            //server default is -1, but default.json overrides it to 1, but cluster.json overrides it to 2
            assert.equal(config.get('cluster').maxWorkers, 2);

            done();
        });
    });

});


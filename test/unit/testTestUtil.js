/* Copyright © 2015 PointSource, LLC. All rights reserved. */
var assert = require('assert'),
    path = require('path'),
    util = require('../../testlib/util'),
    loggerService = require('../../services/logger');


var origAppDir = global.__appDir;

describe('Test Util test', function () {

    //The logger will try to read global.__appDir, so make sure it's set
    beforeEach(function () {
        global.__appDir = path.resolve(__dirname);
    });

    //restore __appDir to its original value
    afterEach(function () {
        global.__appDir = origAppDir;
    });

    it('Test that injectCore loads core modules', function (done) {

        util.injectCore('logger', {}, function(mods) {
            var logger = mods.logger;
            assert.equal(logger, loggerService);
            done();
        });

    });

});


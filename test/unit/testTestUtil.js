/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var assert = require('assert'),
    path = require('path'),
    util = require('../../testlib/util'),
    loggerService = require('../../services/logger');

describe('Test Util test', function () {
    
    var origAppDir;

    //The logger will try to read global.__appDir, so make sure it's set
    before(function () {
        origAppDir = global.__appDir;
        global.__appDir = __dirname;
    });

    //restore __appDir to its original value
    after(function () {
        global.__appDir = origAppDir;
    });

    it('Test that injectCore loads core modules', function (done) {
        global.__appDir = path.resolve(__dirname);

        util.injectCore('logger', {}, function (mods) {
            var logger = mods.logger;
            assert.equal(logger.init.toString(), loggerService.init.toString());
            assert.notDeepEqual(logger, loggerService); // logger has been initialized, loggerService has not
            done();
        });

    });

    it('Test that injectCore can reload core modules cleanly', function (done) {
        global.__appDir = path.resolve(__dirname, '../../examples/swagger');
        util.injectCore(['config', 'swagger'], {}, function (mod1) {
            assert.equal(mod1.config.get('swagger').refCompiler.petstore.baseSpecFile, 'petstore.json');
            assert.equal(mod1.swagger.getSpecNames().length, 3);
            
            global.__appDir = path.resolve(__dirname, '../../examples/redis');
            util.injectCore(['config', 'swagger'], {}, function (mod2) {
                assert.equal(mod2.config.get('swagger').refCompiler, 'off');
                assert.equal(mod2.swagger.getSpecNames().length, 0);
                done();
            });
        });
    });
});


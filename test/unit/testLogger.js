/* Copyright © 2015 PointSource, LLC. All rights reserved. */
var assert = require('assert'),
    path = require('path'),
    util = require('../../testlib/util'),
    _ = require('lodash');

var defaultCfg = {
    'levels': {'silly': 0, 'debug': 1, 'verbose': 2, 'info': 3, 'warn': 4, 'error': 5},
    'colors': {
        'silly': 'magenta',
        'debug': 'cyan',
        'verbose': 'blue',
        'info': 'green',
        'warn': 'yellow',
        'error': 'red'
    },
    'transports': [
        {
            'package': 'winston',
            'field': 'transports.Console',
            'options': {
                'level': 'debug',
                'colorize': true
            }
        }
    ],
    'showLocation': true
};

var origAppDir = global.__appDir;

describe('Logger test', function () {

    //The logger will try to read global.__appDir, so make sure it's set
    beforeEach(function () {
        global.__appDir = path.resolve(__dirname);
    });

    //restore __appDir to its original value
    afterEach(function () {
        global.__appDir = origAppDir;
    });

    it('Should be able to configure log levels', function (done) {
        var cfg = _.clone(defaultCfg);

        //override the log levels
        cfg.levels = {
            'foo': 0,
            'bar': 1
        };

        util.injectCore('logger', {logger: cfg, cluster: {maxWorkers: 1}}, function (services) {
            assert.ok(typeof services.logger.foo !== 'undefined');
            assert.ok(typeof services.logger.bar !== 'undefined');
            done();
        });
    });

    it('Should be able to load external logger config', function (done) {
        global.__appDir = path.resolve(__dirname, './fixtures/logger');
        var cfg = _.clone(defaultCfg);

        util.injectCore('logger', {logger: cfg, cluster: {maxWorkers: 1}}, function (services) {
            //during init, the logger should have loaded the custom logger.js
            //after which isInit() will be true
            var customLoggerInit = require(global.__appDir + '/logger');
            assert.ok(customLoggerInit.isInit());
            done();
        });
    });

    it('Should be able to load custom transports directory', function (done) {
        global.__appDir = path.resolve(__dirname, './fixtures/logger/transports');
        var cfg = _.clone(defaultCfg);
        cfg.transports = [
            {
                package: 'transport',
                field: 'foo.bar',
                options: {key: 'value'}
            }
        ];
        util.injectCore('logger', {logger: cfg, cluster: {maxWorkers: 1}}, function (services) {
            //explicitly load the transport and verify that the options were 
            //passed into it
            var transport = require(global.__appDir + '/transport');
            assert.equal(transport.getOptions().key, 'value');
            done();
        });
    });

    it('Should fail loading custom transport that does not exist', function (done) {
        global.__appDir = path.resolve(__dirname, './fixtures/logger/transports');
        var cfg = _.clone(defaultCfg);
        cfg.transports = [
            {
                package: 'blah',
                field: 'foo.bar'
            }
        ];
        try {
            util.injectCore('logger', {logger: cfg, cluster: {maxWorkers: 1}}, function (services) {
                assert.fail('Should have errored out initializing logger');
            });
        } catch (err) {
            done();
        }

    });

});


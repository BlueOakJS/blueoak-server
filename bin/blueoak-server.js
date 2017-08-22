#!/usr/bin/env node
/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var parseArgs = require('minimist');
var server = require('../');

// parse arguments
var argv = parseArgs(process.argv.slice(2));

// convert mocks from CSV into an array
var mockServices = argv['mock-services'];
if (mockServices) {
    mockServices = mockServices.split(',');
}

server.init({
    appDir: process.cwd(),
    mockServices: mockServices
}, function(err) {
    if (err) {
        console.warn('Startup failed', err);
    } else {
        var logger = this.services.get('logger');
        logger.info('Server started');
    }

});

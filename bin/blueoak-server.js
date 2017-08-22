#!/usr/bin/env node
/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var cli = require('commander');
var pkg = require('../package.json');
var server = require('../');

cli = parseOptions();

server.init({
    appDir: process.cwd(),
    mockServices: cli.mockServices
}, function(err) {
    if (err) {
        console.warn('Startup failed', err);
    } else {
        var logger = this.services.get('logger');
        logger.info('Server started');
    }
});

function parseOptions() {
    // parse cli options
    cli.version(pkg.version)
        .option('--mock-services <services>', 'comma separated list of service names to mock', toList)
        .parse(process.argv);

    return cli;
}

function toList(val) {
    return val.split(',');
}

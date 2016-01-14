#!/usr/bin/env node
/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var server = require('../');

server.init({
    appDir: process.cwd()
}, function(err) {
    if (err) {
        console.warn('Startup failed', err);
    } else {
        var logger = this.services.get('logger');
        logger.info('Server started');
    }

});

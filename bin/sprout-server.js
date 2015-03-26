#!/usr/bin/env node

/* Copyright © 2015 PointSource, LLC. All rights reserved. */

var server = require('sprout-server');

server.init({
    appDir: process.cwd()
}, function(err) {
    if (err) {
        console.warn('Startup failed', err);
    } else {
        console.log('started');
    }

});

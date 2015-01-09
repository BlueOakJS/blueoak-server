#!/usr/bin/env node

var server = require('ps-nas');

server.init({
    appDir: process.cwd()
}, function(err) {
    if (err) {
        console.warn('Startup failed', err);
    } else {
        console.log('started');
    }

});
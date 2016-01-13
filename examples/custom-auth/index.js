/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var server = require('blueoak-server');

server.init(function(err) {
    if (err) {
        console.warn('Startup failed', err);
    } else {
        console.log('started');
    }
});

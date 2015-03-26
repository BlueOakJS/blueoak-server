/* Copyright © 2015 PointSource, LLC. All rights reserved. */
var server = require('sprout-server');

server.init(function(err) {
    if (err) {
        console.warn('Startup failed', err);
    } else {
        console.log('started');

        //At this point we could safely control the server through the server object
    }

});

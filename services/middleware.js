/*
 * The express service takes care of creating the express apps, registering handlers, and then starting the server
 * listening on each configured port.
 */
var express = require('express');

var app = null;

exports.init = function(serviceLoader, callback) {

    app = express();
    serviceLoader.inject('app', app);
    callback();
}

exports.getApp = function() {
    return app;
}
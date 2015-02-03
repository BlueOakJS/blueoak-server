/*
 * The express service takes care of creating the express apps, registering handlers, and then starting the server
 * listening on each configured port.
 */
var express = require('express');

var app = null;
var subAppMap = {}; //map a route, e.g. /test to the express subapp that handles it

exports.init = function(serviceLoader, callback) {

    app = express();
    serviceLoader.inject('app', app);
    callback();
}

/**
 * Get an express app.  If a route path is given, return a subapp for the path, otherwise return the main app.
 * @param routePath a path of a subapp, like '/test'
 * @returns {*}
 */
exports.getApp = function(routePath) {
    if (routePath) {
        var subApp = subAppMap[routePath];
        if (!subApp) {
            subApp = express();
            app.use(routePath, subApp);
            subAppMap[routePath] = subApp;
        }
        return subApp;
    }
    return app;
}
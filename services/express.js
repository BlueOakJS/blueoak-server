exports.metadata = {
    id: "express",
    description: "ExpressJS service",
    dependencies: ['config', 'logger']
};

var _ = require('lodash'),
    express = require('express'),
    path = require('path'),
    async = require('async'),
    fs = require('fs');

var logger = null;


exports.init = function(server, cfg, callback) {
    var httpConf = server.config.get('http');
    logger = server.logger;

    var appMap = {};

    async.each(_.keys(cfg), function(appName, appCallback) {
        var app = express();
        exports[appName] = app;
        appCallback();
    }, function(err) {
        if (err) {
            callback(err);
        } else {

            registerEndpoints(server, function(err) {
                if (err) {
                    callback(err);
                } else {
                    startExpress(cfg, callback);
                }
            });

        }
    });

};

function registerEndpoints(server, callback) {
    var handlerDir = path.join(process.cwd(), 'handlers');
    var files = fs.readdirSync(handlerDir);
    async.each(files, function (file, initCallback) {
        if (path.extname(file) === '.js') {
            logger.debug('Begin initializing handler ' + file);
            var mod = require(path.resolve(handlerDir, file));
            mod.init(server, module.exports, function () {
                logger.debug('Finish initializing handler ' + file);
                initCallback();
            });
        } else {
            initCallback();
        }
    }, function (err) {
        callback(err);
    });
}

function startExpress(cfg, callback) {
    async.each(_.keys(cfg), function(appName, appCallback) {
        var configForApp = cfg[appName];
        var server = exports[appName].listen(configForApp.port, function () {
            var host = server.address().address;
            var port = server.address().port;
            logger.info('App \'%s\' is listening at http://%s:%s', appName, host, port);
            appCallback();
        }).on('error', function(err) {
            appCallback(err);
        });
    }, function(err) {
        callback(err);
    });
}

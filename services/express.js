/*
 * The express service takes care of creating the express apps, registering handlers, and then starting the server
 * listening on each configured port.
 */
exports.metadata = {
    id: "express",
    description: "ExpressJS service",
    dependencies: ['config', 'logger', 'middleware']
};

var _ = require('lodash'),
    express = require('express'),
    path = require('path'),
    async = require('async'),
    fs = require('fs'),
    https = require('https');

var logger = null;

var expressApps = {}; //will be a map of all the registered app names to the app

exports.init = function(server, cfg, callback) {
    var httpConf = server.config.get('http');
    logger = server.logger;

    var appMap = {};

    async.each(_.keys(cfg), function(appName, appCallback) {
        var app = express();
        exports[appName] = app;
        expressApps[appName] = app;
        appCallback();
    }, function(err) {
        if (err) {
            callback(err);

        } else {

            registerMiddleware(server, function(err) {
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

        }
    });

};

function registerMiddleware(server, callback) {
    async.eachSeries(server.middleware.getMiddleware(), function (mwMod, mwCallback) {
        var mwId = mwMod.metadata.id;
        var cfg = server.config.get(mwId);
        mwMod.init(server, expressApps, cfg, mwCallback);
    }, function(err) {
        callback(err);
    });

}

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

        //Is this ssl-enabled?
        if (configForApp.ssl) {

            var sslOptions = null;
            try {
                //Will get an error if one of the files couldn't be read
                sslOptions = resolveSSLOptions(configForApp.ssl);
            } catch (err) {
                return appCallback(new Error('Error reading SSL options: ' + err.message));
            }
            var server = https.createServer(sslOptions, exports[appName]);
            server.listen(configForApp.port, function () {
                var host = server.address().address;
                var port = server.address().port;
                logger.info('App \'%s\' is listening securely on http://%s:%s', appName, host, port);
                appCallback();
            }).on('error', function (err) {
                appCallback(err);
            });
        } else {

            //Non SSL
            var server = exports[appName].listen(configForApp.port, function () {
                var host = server.address().address;
                var port = server.address().port;
                logger.info('App \'%s\' is listening on http://%s:%s', appName, host, port);
                appCallback();
            }).on('error', function (err) {
                appCallback(err);
            });
        }
    }, function(err) {
        callback(err);
    });
}

/**
 * Return a set of SSL options with the file-based options expanded into actual files/buffers.
 * The file-based fields are key, cert, pfx, and ca, where ca can also be an array of files
 * @param options
 * @returns An expanded clone of the original options
 */
function resolveSSLOptions(options) {
    var toReturn = _.clone(options);
    //Resolve the file-based properties
    _.keys(toReturn).forEach(function(key) {
        if (key === 'cert' || key === 'key' || key === 'pfx') {
            toReturn[key] = fs.readFileSync(path.resolve(process.cwd(), toReturn[key]));
        } else if (key === 'ca') { //this can be an array
            if (_.isArray(toReturn[key])) {
                //array
                toReturn[key] = _.map(toReturn[key], function(val) {
                    return fs.readFileSync(path.resolve(process.cwd(), val));
                });
            } else {
                //Single value
                toReturn[key] = fs.readFileSync(path.resolve(process.cwd(), toReturn[key]));
            }
        }
    });
    return toReturn;
}
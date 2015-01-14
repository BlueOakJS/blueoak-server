/*
 * The express service takes care of creating the express apps, registering handlers, and then starting the server
 * listening on each configured port.
 */
var _ = require('lodash'),
    path = require('path'),
    async = require('async'),
    fs = require('fs'),
    https = require('https');

var _logger;

//NOTE: reference to 'app' is a sort of hackish way to force express to load as the last service
exports.init = function(logger, config, app, middleware, serviceLoader, callback) {
    _logger = logger;
    var cfg = config.get('express');

    serviceLoader.initConsumers('middleware', cfg.middleware || [], function(err) {
        if (err) {
            return callback(err);
        }

        serviceLoader.initConsumers('handlers', function(err) {
            if (err) {
                return callback(err);
            }
            return startExpress(cfg, middleware.getApp(), callback);
        });

    });
};

function startExpress(cfg, app, callback) {
    //Is this ssl-enabled?
    if (cfg.ssl) {

        var sslOptions = null;
        try {
            //Will get an error if one of the files couldn't be read
            sslOptions = resolveSSLOptions(cfg.ssl);
        } catch (err) {
            return callback(new Error('Error reading SSL options: ' + err.message));
        }
        var server = https.createServer(sslOptions, app);
        server.listen(cfg.port, function () {
            var host = server.address().address;
            var port = server.address().port;
            _logger.info('App is listening securely on https://%s:%s', host, port);
            callback();
        }).on('error', function (err) {
            callback(err);
        });
    } else {

        //Non SSL
        var server = app.listen(cfg.port, function () {
            var host = server.address().address;
            var port = server.address().port;
            _logger.info('App is listening on http://%s:%s', host, port);
            callback();
        }).on('error', function (err) {
            callback(err);
        });
    }
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
            toReturn[key] = fs.readFileSync(path.resolve(global.__appDir, toReturn[key]));
        } else if (key === 'ca') { //this can be an array
            if (_.isArray(toReturn[key])) {
                //array
                toReturn[key] = _.map(toReturn[key], function(val) {
                    return fs.readFileSync(path.resolve(global.__appDir, val));
                });
            } else {
                //Single value
                toReturn[key] = fs.readFileSync(path.resolve(global.__appDir, toReturn[key]));
            }
        }
    });
    return toReturn;
}
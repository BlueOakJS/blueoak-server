/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
/*
 * The express service takes care of creating the express apps, registering handlers, and then starting the server
 * listening on each configured port.
 */
var express = require('express'),
    di = require('../lib/di'),
    _ = require('lodash');

var app = null;

exports.init = function(config, serviceLoader, callback) {
    app = express();
    
    serviceLoader.inject('app', app);

    var cfg = config.get('express');

    //middleware
    serviceLoader.initConsumers('middleware', cfg.middleware || [], function initMiddlewareCallback(err) {
        return callback(err);
    });
};

exports.getApp = function() {
    return app;
};

exports.getDependencies = function(serviceLoader) {
    var mods = serviceLoader.getConsumers('middleware');
    var params = [];
    for (var i = 0; i < mods.length; i++) {
        params = params.concat(di.getParamNames(mods[i].init));
    }
    var result = _.unique(params);
    return  _.without(result, 'app');
};
/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
/**
 * Enables the body-parser middleware: https://github.com/expressjs/body-parser
 *
 * Body parser supports four types: urlencoded, json, raw, text, which each have their own options.
 *
 * To configure, add config for body parser for whichever type(s) you want to enable, e.g.
 *
 * "body-parser": {
 *   "json": {
 *     "strict": true
 *   },
 *
 *   "urlencoded": {
 *     "extended": false
 *   }
 * }
 */
var bodyParser = require('body-parser');
var _ = require('lodash');

exports.init = function(app, config, logger) {

    //allow to be configured through both bodyParser and body-parser
    var cfg = _.extend({}, config.get('bodyParser'), config.get('body-parser'));

    var types = ['urlencoded', 'json', 'raw', 'text'];
    types.forEach(function (type) {
        if (cfg[type]) {
            logger.debug('Enabled body parser for type %s.', type);
            app.use(bodyParser[type](cfg[type]));
        }
    });
};
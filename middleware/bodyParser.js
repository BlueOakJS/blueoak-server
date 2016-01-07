/* Copyright © 2015 PointSource, LLC. All rights reserved. */
/**
 * Enables the body-parser middleware: https://github.com/expressjs/body-parser
 *
 * Body parser supports four types: urlencoded, json, raw, text, which each have their own options.
 *
 * To configure, add config for body parser for whichever type(s) you want to enable, e.g.
 *
 * "bodyParser": {
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

exports.init = function(app, config, logger) {
    var cfg = config.get('bodyParser');

    var types = ['urlencoded', 'json', 'raw', 'text'];
    types.forEach(function (type) {
        if (cfg[type]) {
            logger.debug('Enabled body parser for type %s.', type);
            app.use(bodyParser[type](cfg[type]));
        }
    });
};
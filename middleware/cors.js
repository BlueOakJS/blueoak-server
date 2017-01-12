/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
/*
 * Use the node-cors library to enable CORS on all express.js apps and endpoints.
 *
 * All config options are passed directly to the cors library.
 * See https://github.com/troygoode/node-cors#configuration-options
 */

var cors = require('cors');

exports.init = function(app, config, logger, callback) {
    var cfg = config.get('cors');
    if (typeof cfg.origin === 'object') { //this is meant to be regex
        if (cfg.origin.regex) {
            cfg.origin = new RegExp(cfg.origin.regex);
        }
    } else if (Array.isArray(cfg.origin)) {
        cfg.origin.forEach(function (origin, index) {
            if (typeof origin === 'object') { //this is meant to be regex
                if (origin.regex) {
                    cfg.origin[index] = new RegExp(origin.regex);
                }
            }
        });
    }
    app.use(cors(cfg));
    logger.debug('Enabled CORS.');
    callback();
};

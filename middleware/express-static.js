/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
/*
 * Use the express-static library to enable static file loading on all express.js apps and endpoints.
 *
 * All config options are passed directly to the express-static library.
 * See https://github.com/song940/express-static for more information
 *
 * Add a JSON block to the application default.json with the following:
 *    "express-static" : {
 *       "www": "./mywwwdir"
 *    }
 *    This will serve the static content from the mywwwdir directory relative to the default
 *    application server directory.
 *
 * If you want to use a different context root, specify the "context" property.
 *
 * "express-static" : {
 *       "www": "./mywwwdir",
 *       "context": "/static"
 *    }
 *
 * To enable: add "express-static" to the middleware list of services to load in default.json.
 */

var path = require('path'),
    es = require('express-static');

exports.init = function (app, config, logger) {
    var cfg = config.get('express-static');
    var cfgDir = cfg.www;
    if (!cfgDir) {
        cfgDir = cfg.docs;
    }
    if (!cfgDir) {
        logger.warn('No document root is configured for express-static.');
    } else {
        var docsDir = path.resolve(global.__appDir, cfgDir);
        if (typeof cfg.context == 'undefined') {
            logger.info('Serving static content from: %s.', docsDir);
            app.use(es(docsDir));
        } else {
            logger.info('Serving static content from %s at %s.', docsDir, cfg.context);
            app.use(cfg.context, es(docsDir));
        }

    }
};

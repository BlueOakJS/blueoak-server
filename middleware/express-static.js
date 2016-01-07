/* Copyright © 2015 PointSource, LLC. All rights reserved. */
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
        logger.info('Serving static content from: %s.', docsDir);
        app.use(es(docsDir));
    }
};

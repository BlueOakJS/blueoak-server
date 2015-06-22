/* Copyright © 2015 PointSource, LLC. All rights reserved. */
/*
 * Use the node-cors library to enable CORS on all express.js apps and endpoints.
 *
 * All config options are passed directly to the cors library.
 * See https://github.com/troygoode/node-cors#configuration-options
 */

var _ = require('lodash'),
    cors = require('cors');

var allowedOrigins = null;
var logger = null;

exports.init = function(app, config, logger, callback) {
    cfg = config.get('cors');
    allowedOrigins = cfg.allowOrigin;
    app.use(cors(cfg));
    logger.debug('Enabled CORS.');
    callback();
};

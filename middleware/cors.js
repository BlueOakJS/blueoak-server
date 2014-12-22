/*
 * Use the node-cors library to enable CORS on all express.js apps and endpoints.
 *
 * All config options are passed directly to the cors library.
 * See https://github.com/troygoode/node-cors#configuration-options
 */

exports.metadata = {
    id: "cors",
    description: "Adds CORS support"
};

var _ = require('lodash'),
    cors = require('cors');

var allowedOrigins = null;
var logger = null;

exports.init = function(server, apps, cfg, callback) {

    logger = server.get('logger');
    allowedOrigins = cfg.allowOrigin;
    _.keys(apps).forEach(function(appName) {
        apps[appName].use(cors(cfg));
        logger.debug('Added CORS to ' + appName);
    });
    callback();
};

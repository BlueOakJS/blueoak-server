/*
 * Use the node-cors library to enable CORS on all express.js apps and endpoints.
 *
 * All config options are passed directly to the cors library.
 * See https://github.com/troygoode/node-cors#configuration-options
 */

exports.metadata = {
    description: "Enables an HTTP session"
};

var session = require('cookie-session'),
    _ = require('lodash');

var logger = null;

exports.init = function(server, apps, cfg, callback) {

    logger = server.get('logger');
    if (cfg.type === 'cookie') {

        var keys = cfg.keys;
        if (!keys) {
            logger.error('Cookie sessions require a key to be set.');
        } else {
            _.keys(apps).forEach(function(appName) {
                apps[appName].use(session({
                    keys: keys
                }));
                logger.debug('Added session to ' + appName);
            });
        }
    } else {
        logger.error('Unknown session type', cfg.type);
    }
    callback();
};

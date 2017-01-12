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


var session = require('cookie-session');


exports.init = function(app, config, logger, callback) {
    var cfg = config.get('session');
    if (cfg.type === 'cookie') {

        var keys = cfg.keys;
        if (!keys) {
            logger.error('Cookie sessions require a key to be set.');
        } else {
            app.use(session(cfg));
            logger.debug('Enabled cookie session.');
        }
    } else {
        logger.error('Unknown session type', cfg.type);
    }
    callback();
};

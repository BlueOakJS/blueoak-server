/*
 * Copyright 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
exports.init = function(app, config, logger, monitor) {
    var cfg = config.get('express-monitor');
    if (monitor.enabled()) {
        logger.debug('Enabled express monitor.');
        app.use(monitor.express(cfg.prefix, true));
    }

};
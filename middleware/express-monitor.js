exports.init = function(app, config, logger, monitor) {
    var cfg = config.get('express-monitor');
    if (monitor.enabled()) {
        logger.debug('Enabled express monitor.');
        app.use(monitor.getExpressHelper(cfg.prefix, { timeByUrl: true }));
    }

}
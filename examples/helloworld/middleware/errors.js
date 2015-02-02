exports.init = function(app, logger) {
    logger.debug('init error handler');
    app.use(function(err, req, res, next){
        logger.error(err.stack);
        res.status(500).send(err.message);
    });
}
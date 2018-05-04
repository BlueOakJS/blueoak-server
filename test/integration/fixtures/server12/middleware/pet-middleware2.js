exports.init = function (app, config, logger, callback) {
    app.use(middleware);
    logger.info('Pet Middleware2 initialized');
    callback();
};

function middleware(req, res, next) {
    res.header('x-pet-middleware2', 'pet-middleware2');
    next();
}

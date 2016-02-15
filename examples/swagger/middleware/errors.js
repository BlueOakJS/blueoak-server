/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
exports.init = function(app, logger) {
    app.use(function(err, req, res, next) {
        if (err.name === 'ValidationError') {
            logger.debug('Validation Error details: ' + JSON.stringify(err, null, 2));
            res.json({error: err.message});
        } else {
            return next();
        }
    });
};
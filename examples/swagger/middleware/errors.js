/* Copyright © 2015 PointSource, LLC. All rights reserved. */
exports.init = function(app, logger) {
    app.use(function(err, req, res, next) {
        if (err.name === 'ValidationError') {
            res.json({error: err.message});
        } else {
            next();
        }
    });
}
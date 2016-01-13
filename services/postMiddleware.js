/*
 * Copyright 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
/*
 * post middleware runs after all the express handlers have been registered.
 *
 * defined in the config under the 'middleware$' key.
 * It's useful for things like error handlers.
 *
 * We always load the built-in error handler, middleware/_errors.js, last.
 * That way an app gets the opportunity to handle the error themselves first.
 */
exports.init = function(config, serviceLoader, express, callback) {

    var cfg = config.get('express');
    var postMiddleware = cfg['middleware$'] || [];
    postMiddleware = postMiddleware.concat('_errors');

    serviceLoader.initConsumers('middleware', postMiddleware, function initPostHandlerCallback(err) {
        callback(err);
    });
};

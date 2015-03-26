/* Copyright © 2015 PointSource, LLC. All rights reserved. */
/*
 * post middleware runs after all the express handlers have been registered.
 *
 * defined in the config under the 'middleware$' key.
 * It's useful for things like error handlers.
 */
exports.init = function(config, serviceLoader, express, callback) {

    var cfg = config.get('express');

    serviceLoader.initConsumers('middleware', cfg['middleware$'] || [], function initPostHandlerCallback(err) {
        callback(err);
    });
};

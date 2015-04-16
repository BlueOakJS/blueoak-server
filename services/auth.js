/* Copyright © 2015 PointSource, LLC. All rights reserved. */
/*
 * Initializes the 'auth' consumers.
 *
 * For each authentication consumer, the express middleware is registered so that it can be accessed by calling 'get'
 *
 * Example:
 *
 * var expressFunc = auth.get('name');
 * app.get('/route', expressFunc, function(req, res, next) {...});
 *
 * In general apps shouldn't ever need to directly access the auth service.
 */

var callbacks = {};

module.exports.init = function(logger, middleware, serviceLoader, callback) { //dep on middleware ensures it starts after middleware
    logger.info("Starting auth services");

    serviceLoader.initConsumers('auth', function initAuthCallback(err) {
        //registerDeclarativeRoutes(middleware.getApp(), config.get('routes'), serviceLoader, logger);
        if (err) {
            return callback(err);
        }

        registerCallbacks(logger, serviceLoader);
        callback();
    });
}

function registerCallbacks(logger, serviceLoader) {
    var authList = serviceLoader.getConsumers('auth');
    authList.forEach(function(auther) {
        if (auther.authenticate) {
            callbacks[auther.__id] = auther.authenticate;
        } else {
            logger.warn('%s does not contain an authenticate method.', auther.__id);
        }
    });
}

module.exports.get = function(name) {
    if (!callbacks[name]) {
        throw new Error('Cannot find auth named ' + name);
    }
    return callbacks[name];
}
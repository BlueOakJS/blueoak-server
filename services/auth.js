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
var vm = require('vm');

var callbacks = {};
var cfg = null;

module.exports.init = function(logger, config, app, middleware, serviceLoader, callback) { //dep on middleware ensures it starts after middleware
    logger.info('Starting auth services');
    cfg = config.get('auth');

    serviceLoader.initConsumers('auth', function initAuthCallback(err) {

        //registerDeclarativeRoutes(middleware.getApp(), config.get('routes'), serviceLoader, logger);
        if (err) {
            return callback(err);
        }

        registerCallbacks(logger, serviceLoader);

        callback();
    });
};

//Look up the middleware functions for the global auth, as well as
//any specified under additionalAuthNames, e.g. names of auth on individual routes.
//Return an array of middleware functions
module.exports.getAuthMiddleware = function(additionalAuthNames) {
    var middleware = [];
    var authNames = [];
    authNames = authNames.concat(cfg.provider || []);
    authNames = authNames.concat(additionalAuthNames || []);

    if (authNames.length > 0) {
        authNames.forEach(function (name) {
            var authCallback = exports.get(name);
            middleware.push(authCallback);
        });
    }

    return middleware;
};


function registerCallbacks(logger, serviceLoader) {
    var authList = serviceLoader.getConsumers('auth');
    authList.forEach(function(auther) {
        if (auther.authenticate) {
            callbacks[auther.__id] = auther.authenticate;
        } else {
            logger.error('%s does not contain an authenticate or roles method.', auther.__id);
        }
    });
}

module.exports.get = function(name) {
    if (!callbacks[name]) {
        throw new Error('Cannot find auth named ' + name);
    }
    return callbacks[name];
};

//Returns middleware that will evaluate the given expression.
//Expressions are evaluated in a sandbox.
//Currently the request's user data is the only thing exposed to the validator (via $user object).
//If expression returns true, the request is allowed.  Otherwise it returns 401.
module.exports.validate = function(expression) {
    return function(req, res, next) {
        var sandbox = {
            '$user': req.user
        };

        try {
            var result = vm.runInNewContext(expression, sandbox);
            if (result === true) {
                return next();
            } else {
                return res.sendStatus(401);
            }
        } catch (err) {
            services.get('logger').error('Error evaluating validator expression %s: %s', expression, err.toString());
            return res.sendStatus(500);
        }

    };
};
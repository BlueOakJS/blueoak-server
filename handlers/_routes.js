/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var _ = require('lodash');

exports.init = function (app, config, serviceLoader, auth, logger) {
    var routes = config.get('routes');
    registerDeclarativeRoutes(app, config, routes, serviceLoader, auth, logger);
};


/*
 * Load the "routes" config and register all the routes.
 * Any errors that might occur because of mis-configured routes will be logged.
 */
function registerDeclarativeRoutes(app, config, routes, serviceLoader, auth, logger) {

    _.keys(routes).forEach(function (routePath) {
        //routePath should be of form "<method> path"
        var parts = routePath.split(' ');
        if (parts.length !== 2) {
            return logger.warn('Invalid route path "%s"', routePath);
        }

        var methods = ['get', 'post', 'put', 'delete', 'all'];

        if (!_.includes(methods, parts[0])) {
            return logger.warn('Invalid method "%s" on route "%s"', parts[0], parts[1]);
        }

        var handler = routes[routePath].handler;
        if (!handler) {
            return logger.warn('Missing handler for route "%s"', parts[1]);
        }

        //handler is something like foo.bar where there's a foo.js handler module which exports bar
        var handlerParts = handler.split('.');

        if (handlerParts.length !== 2) {
            return logger.warn('Invalid handler reference "%s"', parts[1]);
        }

        var handlerMod = serviceLoader.getConsumer('handlers', handlerParts[0]);
        if (!handlerMod) {
            return logger.warn('Could not find handler module named "%s".', handlerParts[0]);
        }

        var handlerFunc = handlerMod[handlerParts[1]];
        if (!handlerFunc) {
            return logger.warn('Could not find handler function "%s" for module "%s"', handlerParts[1], handlerParts[0]);
        }

        //Some other projects have defined their own auth scheme.
        //As a temporary workaround, we ignore auth if the auth field is using their scheme,
        //which is an object instead of a string or array.
        var middleware = [];
        if (routes[routePath].auth && !_.isPlainObject(routes[routePath].auth)) {
            middleware = auth.getAuthMiddleware(routes[routePath].auth);
        } else if (!routes[routePath].auth) { //at least set up global auth if it's available
            middleware = auth.getAuthMiddleware();
        } else {
            logger.debug('Ignoring auth');
        }

        //Set up custom validator function on the route
        if (routes[routePath].validate) {
            logger.warn('Using experimental validators.  This might change in the future.');
            var expression = routes[routePath].validate;
            middleware.push(auth.validate(expression));
        }

        middleware.push(handlerFunc);

        //register the route and handler function with express
        app[parts[0]].call(app, parts[1], middleware);
    });

}
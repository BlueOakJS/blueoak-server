var _ = require('lodash');
var base64URL = require('base64url');

var log;
var loader;
var httpMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];
//map of middleware ids to 'true' meaning that they have been initialized
var customSecurityMiddlewareInitMap = {};

module.exports = {
    init: init
};

function init(app, logger, serviceLoader, swagger) {
    log = logger;
    loader = serviceLoader;
    _.forEach(swagger.getSimpleSpecs(), function (api, name) {
        var basePath = api.basePath || '';
        // apply security requirements to each route path
        _.forEach(_.keys(api.paths), function (path) {
            var pathObj = api.paths[path];
            var routePath = basePath + convertSwaggerPathToExpressPath(path);

            // and each HTTP method on that path
            _.forEach(_.keys(pathObj), function (method) {
                if (_.contains(httpMethods, method)) {
                    var operation = pathObj[method];
                    _.forEach(operation['security'], function (securityRequirement) {
                        _.forOwn(securityRequirement, function (scopes, securityDefinition) {
                            applySecurityRequirement(app, method, routePath, securityDefinition,
                                api.securityDefinitions[securityDefinition], scopes);
                        });
                    });
                    _.forEach(operation['x-bos-security'], function (customSecurityRequirement) {
                        _.forOwn(customSecurityRequirement, function (scopes, customSecurityDefinition) {
                            applyCustomSecurityRequirement(app, method, routePath, customSecurityDefinition,
                                api['x-bos-securityDefinitions'][customSecurityDefinition], scopes);
                        });
                    });
                }
            });
        });
    });
}

function applyCustomSecurityRequirement(app, method, route, securityRequirement, securityDefinition, requiredScopes) {
    //load security def middleware
    if (securityDefinition['x-bos-middleware']) {
        var customAuthMiddleware = loader.getConsumer('middleware', securityDefinition['x-bos-middleware']);
        if (!customAuthMiddleware) {
            loader.loadConsumerModules('middleware',
                [securityDefinition['x-bos-middleware']]);
            customAuthMiddleware = loader.getConsumer('middleware', securityDefinition['x-bos-middleware']);
        }
        if (!customSecurityMiddlewareInitMap[securityDefinition['x-bos-middleware']]) {
            loader.initConsumers('middleware', [securityDefinition['x-bos-middleware']], function (err) {
                if (!err) {
                    wireAuthenticateToRoute(app, method, route, securityRequirement,
                        securityDefinition, requiredScopes, customAuthMiddleware);
                }
                else {
                    log.warn('Unable to initialize custom middleware %s for security defn %s',
                        securityDefinition['x-bos-middleware'], securityRequirement);
                }
            });
        } else {
            wireAuthenticateToRoute(app, method, route, securityRequirement,
                securityDefinition, requiredScopes, customAuthMiddleware);
        }
    } else {
        log.info('No custom middleware defined for security defn %s. ' +
            'Attempting to use built in middleware...', securityRequirement);
        applySecurityRequirement(app, method, route, securityRequirement,
            securityDefinition, requiredScopes);
    }
}

function wireAuthenticateToRoute(app, method, route,
                                 securityRequirement, securityDefinition, requiredScopes, customAuthMiddleware) {
    if (customAuthMiddleware.authenticate) {
        app[method].call(app, route,
                         customAuthMiddleware.authenticate(securityRequirement, securityDefinition, requiredScopes));
    }
    else {
        log.warn('Custom auth middleware %s missing authenticate method');
    }
}

function applySecurityRequirement(app, method, route, securityRequirement, securityDefinition, requiredScopes) {
    // allow use of custom middleware even if a custom security definition was not used
    if (securityDefinition['x-bos-middleware']) {
        applyCustomSecurityRequirement(app, method, route, securityRequirement,
            securityDefinition, requiredScopes);
    } else {
        switch (securityDefinition.type) {
        case 'basic':
            app[method].call(app, route, basicAuthentication(securityRequirement));
            break;
        case 'apiKey':
            // may also need a user provided 'verify' function here
            app[method].call(app, route, apiKeyAuthentication(securityRequirement, securityDefinition));
            break;
        case 'oauth2':
            log.warn('No out-of-the-box oauth2 implementation exists in BlueOak Server.\n' +
                'You must define your own and reference it in the ' +
                '"x-bos-middleware" property of the security definition "%s".\n' +
                'The bos-passport module may also be used to leverage the passport OAuth services.',
                securityRequirement);
            break;
        default:
            return log.warn('Unrecognized security type "%s" for security definition "%s".\n' +
                'You can provide a custom security definition in "x-bos-securityDefinitions".',
                securityDefinition.type, securityRequirement);
        }
    }
}

function basicAuthentication(securityReq) {
    return function (req, res, next) {
        if (!req.bosAuthenticationData) {
            req.bosAuthenticationData = [];
        }
        var authenticationData = {
            type: 'basic',
            securityReq: securityReq
        };
        req.bosAuthenticationData.push(authenticationData);
        var authHeader = req.get('authorization') ? req.get('authorization') : '';
        if (authHeader !== '') { //header should be of the form "Basic " + user:password as a base64 encoded string
            var credentialsBase64 = authHeader.split('Basic ')[1];
            var credentialsDecoded = base64URL.decode(credentialsBase64);
            var credentials = credentialsDecoded.split(':');
            authenticationData.username = credentials[0];
            authenticationData.password = credentials[1];
        }
        return next();
    };
}

function apiKeyAuthentication(securityReq, securityDefn) {
    return function (req, res, next) {
        if (!req.bosAuthenticationData) {
            req.bosAuthenticationData = [];
        }
        var authenticationData = {
            type: securityDefn.type,
            securityReq: securityReq,
            securityDefn: securityDefn
        };
        req.bosAuthenticationData.push(authenticationData);
        if (securityDefn.in === 'query') {
            authenticationData.password = req.query[securityDefn.name];
        }
        else if (securityDefn.in === 'header') {
            authenticationData.password = req.get(securityDefn.name);
        }
        else {
            log.warn('unknown location %s for apiKey. ' +
                'looks like open api specs may have changed on us', securityDefn.in);
        }
        return next();
    };
}

//swagger paths use {blah} while express uses :blah
function convertSwaggerPathToExpressPath(swaggerPath) {
    var reg = /\{([^\}]+)\}/g;  //match all {...}
    var expressPath = swaggerPath.replace(reg, ':$1');
    return expressPath;
}
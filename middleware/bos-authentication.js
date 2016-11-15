var _ = require('lodash');
var base64URL = require('base64url');

var log;
var loader;
var httpMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];
//map of middleware ids to 'true' meaning that they have been initialized
var middlewareInitMap = {};

module.exports = {
    init : init
};

function init(app, logger, serviceLoader, swagger) {
    log = logger;
    loader = serviceLoader;
    _.forEach(swagger.getSimpleSpecs(), function (api, name) {
        var basePath = api.basePath || '';
        /* apply security requirements to each route path*/
        _.forEach(_.keys(api.paths), function (path) {
            var pathObj = api.paths[path];
            var routePath = basePath + _convertPathToExpress(path);

            //loop for http method keys, like get and post
            _.forEach(_.keys(pathObj), function (method) {
                if (_.contains(httpMethods, method)) {
                    var operation = pathObj[method];
                    _.forEach(operation['security'], function (securityReq) {
                        _.forOwn(securityReq, function (scopes, securityDefn) {
                            _applySecurityRequirement(app, method, routePath, securityDefn,
                                api.securityDefinitions[securityDefn],
                                scopes);
                        });
                    });
                    _.forEach(operation['x-bos-security'], function (securityReq) {
                        _.forOwn(securityReq, function (scopes, securityDefn) {
                            _applyCustomSecurityRequirement(app, method, routePath, securityDefn,
                                api['x-bos-securityDefinitions'][securityDefn],
                                scopes);
                        });
                    });
                }
            });
        });
    });
}

function _applyCustomSecurityRequirement(app, method, route, securityReq,
                                   securityDefn, requiredScopes) {
    //load security def middleware
    if (securityDefn['x-bos-middleware']) {
        var customAuthMiddleware = loader.getConsumer('middleware', securityDefn['x-bos-middleware']);
        if (!customAuthMiddleware) {
            loader.loadConsumerModules('middleware',
                [securityDefn['x-bos-middleware']]);
            customAuthMiddleware = loader.getConsumer('middleware', securityDefn['x-bos-middleware']);
        }
        if (!middlewareInitMap[securityDefn['x-bos-middleware']]) {
            loader.initConsumers('middleware', [securityDefn['x-bos-middleware']], function (err) {
                if (!err) {
                    wireAuthenticateToRoute(app, method, route, securityReq,
                        securityDefn, requiredScopes, customAuthMiddleware);
                }
                else {
                    log.warn('Unable to initialize custom middleware %s for security defn %s',
                        securityDefn['x-bos-middleware'], securityReq);
                }
            });
        } else {
            wireAuthenticateToRoute(app, method, route, securityReq,
                securityDefn, requiredScopes, customAuthMiddleware);
        }
    } else {
        log.info('No custom middleware defined for security defn %s. ' +
            'Attempting to use built in middleware...', securityReq);
        _applySecurityRequirement(app, method, route, securityReq,
            securityDefn, requiredScopes);
    }
}

function wireAuthenticateToRoute(app, method, route, securityReq, securityDefn, requiredScopes, customAuthMiddleware) {
    if (customAuthMiddleware.authenticate) {
        app[method].call(app, route, customAuthMiddleware.authenticate(securityReq, securityDefn, requiredScopes));
    }
    else {
        log.warn('custom auth middleware %s missing authenticate method');
    }
}

function _applySecurityRequirement(app, method, route, securityReq,
                                   securityDefn, requiredScopes) {
    //allow use of custom middleware even if a custom security definition was not used
    if (securityDefn['x-bos-middleware']) {
        _applyCustomSecurityRequirement(app, method, route, securityReq,
            securityDefn, requiredScopes);
    } else {
        switch (securityDefn.type) {
        case 'basic':
            app[method].call(app, route, basicAuthentication(securityReq));
            break;
        case 'apiKey': //may also need a user provided 'verify' function here
            app[method].call(app, route, apiKeyAuthentication(securityReq, securityDefn));
            break;
        case 'oauth2':
            /*if (!oAuthService) {
                oAuthService = loader.get('oauth2');
            }
            app[method].call(app, route, oauth2(securityReq, securityDefn, requiredScopes));*/
            log.warn('No out of the box oauth2 implementation exists in BOS. ' +
                'You must define your own and reference it in the ' +
                '"x-bos-middleware" property of the security definition %s', securityReq);
            break;
        default:
            return log.warn('unrecognized security type %s for security definition %s' +
                'You can provide a custom security definition in "x-bos-securityDefinitions" of your base spec',
                securityDefn.type, securityReq);
        }
    }
}

function basicAuthentication(securityReq) {
    return function (req, res, next) {
        if (!req.bosAuthenticationData) {
            req.bosAuthenticationData = [];
        }
        var authenticationData = {type: 'basic', securityReq: securityReq};
        req.bosAuthenticationData.push(authenticationData);
        var authHeader = req.get('authorization') ? req.get('authorization') : '';
        if (authHeader !== '') { //header should be of the form "Basic " + user:password as a base64 encoded string
            var credentialsBase64 = authHeader.split('Basic ')[1];
            var credentialsDecoded = base64URL.decode(credentialsBase64);
            var credentials = credentialsDecoded.split(':');
            authenticationData.username = credentials[0];
            authenticationData.password = credentials[1];
        }
        next();
    };
}

function apiKeyAuthentication(securityReq, securityDefn) {
    return function (req, res, next) {
        if (!req.bosAuthenticationData) {
            req.bosAuthenticationData = [];
        }
        var authenticationData = {type: securityDefn.type, securityReq: securityReq, securityDefn: securityDefn};
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
        next();
    };
}

/*function oauth2(securityReq, securityDefn, scopes) {
    return function (req, res, next) {
        if (!req.bosAuthenticationData) {
            req.bosAuthenticationData = [];
        }
        if (securityDefn.flow === 'accessCode') {
            if (!req.session) {
                log.error('oauth2 accessCode flow requires that session be enabled');
                return res.sendStatus(401);
            }
            else if (req.session.bosAuthenticationData) { //already authenticated
                req.bosAuthenticationData.push(req.session.bosAuthenticationData);
                return next();
            } else {
                req.session.bosAuthenticationData = {
                    type: securityDefn.type,
                    securityReq: securityReq,
                    securityDefn: securityDefn
                };
                req.bosAuthenticationData.push(req.session.bosAuthenticationData);
            }
        } else if (req.get('authorization')) { //implicit
            var authenticationData = {type: securityDefn.type, securityReq: securityReq, securityDefn: securityDefn};
            req.bosAuthenticationData.push(authenticationData);
            authenticationData.password =
                req.get('authorization').split('Bearer ')[1]; //we assume bearer token type which is the most common
            if (authenticationData.password) { //already authenticated
                //user defined code will be responsible for validating this token
                //which they absolutely should do because it did not come directly from oauth provider
                return next();
            }
        }
        var oAuthInstance = oAuthService.getOAuthInstance(securityReq);
        if (!oAuthInstance) {
            oAuthInstance = new oAuthService.OAuth2(securityDefn.authorizationUrl,
                securityDefn.flow, securityDefn.tokenUrl);
            oAuthService.addOAuthInstance(securityReq, oAuthInstance);
        }
        oAuthInstance.startOAuth(securityReq, scopes, req, res);
    };
}*/

//swagger paths use {blah} while express uses :blah
function _convertPathToExpress(swaggerPath) {
    var reg = /\{([^\}]+)\}/g;  //match all {...}
    swaggerPath = swaggerPath.replace(reg, ':$1');
    return swaggerPath;
}
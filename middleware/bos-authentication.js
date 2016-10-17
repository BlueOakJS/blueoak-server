var _ = require('lodash');
var base64URL = require('base64url');
var path = require('path');

var log;
var loader;
var oAuthService;
var httpMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];
//map of security reqs to express middleware callbacks
var securityReqMap = {};

module.exports = {
    init : init
};

function init(app, config, logger, serviceLoader, swagger) {
    log = logger;
    loader = serviceLoader;
    _.forEach(swagger.getSimpleSpecs(), function (api, name) {
        var basePath = api.basePath || '';
        /* apply security requirements to each route path*/
        _.keys(api.paths).forEach(function (path) {
            var pathObj = api.paths[path];
            var routePath = basePath + _convertPathToExpress(path);

            //loop for http method keys, like get an post
            _.keys(pathObj).forEach(function (method) {
                if (_.contains(httpMethods, method)) {
                    var operation = pathObj[method];
                    if (operation['security']) {
                        operation['security'].forEach(function (securityReq) {
                            _.forOwn(securityReq, function (scopes, securityDefn) {
                                _applySecurityRequirement(app, method, routePath, securityDefn,
                                    api.securityDefinitions[securityDefn],
                                    /*operation['x-bos-permissions'][securityReq],*/
                                    scopes);
                            });
                        });
                    }
                    if (operation['x-bos-security']) {
                        operation['x-bos-security'].forEach(function (securityReq) {
                            _.forOwn(securityReq, function (scopes, securityDefn) {
                                _applyCustomSecurityRequirement(app, method, routePath, securityDefn,
                                    api['x-bos-securityDefinitions'][securityDefn],
                                    /*operation['x-bos-permissions'][securityReq],*/
                                    scopes);
                            });
                        });
                    }
                }
            });
        });
    });
}

function _applyCustomSecurityRequirement(app, method, route, securityReq,
                                   securityDefn, /*requiredPermissions,*/ requiredScopes) {
    //load security def middleware
    if (securityDefn['x-bos-middleware']) {
        loader.loadConsumerModules('middleware',
            [path.join(global.__appDir, 'middleware', securityDefn['x-bos-middleware'])]);
        loader.initConsumers('middleware', [securityDefn['x-bos-middleware']], function (err) {
            if (!err) {
                var customAuthMiddleware = loader.getConsumer('middleware', securityDefn['x-bos-middleware']);
                if (customAuthMiddleware.authenticate) {
                    if (!securityReqMap[securityReq]) {
                        securityReqMap[securityReq] =
                            customAuthMiddleware.authenticate(securityReq, securityDefn, requiredScopes);
                    }
                    app[method].call(app, route, securityReqMap[securityReq]);
                }
                else {
                    log.warn('custom auth middleware %s missing authenticate method');
                }
            }
            else {
                log.warn('Unable to find custom middleware %s for security defn %s',
                    securityDefn['x-bos-middleware'], securityReq);
            }
        });
    } else {
        log.info('No custom middleware defined for security defn %s. ' +
            'Attempting to use built in middleware...', securityReq);
        _applySecurityRequirement(app, method, route, securityReq,
            securityDefn, requiredScopes);
    }
}

function _applySecurityRequirement(app, method, route, securityReq,
                                   securityDefn, /*requiredPermissions,*/ requiredScopes) {
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
            if (!oAuthService) {
                oAuthService = loader.get('oauth2');
            }
            app[method].call(app, route, oauth2(securityReq, securityDefn, requiredScopes));
            /*log.warn('No out of the box oauth2 implementation exists in BOS. ' +
                'You must define your own and reference it in the ' +
                '"x-bos-middleware" property of the security definition %s', securityReq);*/
            break;
        default:
            return log.warn('unrecognized security type %s for security definition %s' +
                'You can provide a custom security definition in "x-bos-securityDefinitions" of your base spec',
                securityDefn.type, securityReq);
        }
    }
    /*//wire up path with user defined authentication method for this req
    if (cfg.authenticationMethods[securityReq]) {
        var parts = cfg.authenticationMethods[securityReq].split('.');
        var service = loader.get(parts[0]);
        if (!service) {
            return log.warn('Could not find service module named "%s".', parts[0]);
        }
        var serviceMethod = service[parts[1]];
        if (!_.isFunction(serviceMethod)) {
            return log.warn('Authentication function %s on module %s is missing or invalid.',
                parts[1], parts[0]);
        }
        //scopes included here for security type oauth2 where authentication/authorization happens in one go
        app[method].call(app, route, _.partialRight(serviceMethod, securityReq,
            securityDefn, requiredScopes));
        //wire up path with user defined authorization method
        if (cfg.authorizationMethods[securityReq]) {
            parts = cfg.authorizationMethods[securityReq].split('.');
            service = loader.get(parts[0]);
            if (!service) {
                return log.warn('Could not find service module named "%s".', parts[0]);
            }
            serviceMethod = service[parts[1]];
            if (!_.isFunction(serviceMethod)) {
                return log.warn('Authorization function %s on module %s is missing or invalid.',
                    parts[1], parts[0]);
            }
            var wrappedAuthorizationMethod = wrapAuthorizationMethod(serviceMethod, route,
                securityDefn, requiredPermissions);
            app[method].call(app, route, _.partialRight(wrappedAuthorizationMethod, route,
                securityDefn, requiredPermissions));
        } else {
            return log.warn('No authorization method found for security requirement %s', securityReq);
        }
    } else {
        return log.warn('No authentication method defined for security requirement %s', securityReq);
    }*/
}

/*function wrapAuthorizationMethod(authorizationMethod, route, securityDefn, requiredPermissions) {
    return function (req, res, next) {
        var runTimeRequiredPermissions = _expandRouteInstancePermissions(requiredPermissions, route, req.path);
        authorizationMethod.call(this, req, res, next, securityDefn, runTimeRequiredPermissions);
    };
}*/

function basicAuthentication(securityReq) {
    return function (req, res, next) {
        if (req.bosAuthenticationData && !res.getHeader('WWW-Authenticate')) { //already authenticated
            return next();
        }
        //header should be of the form "Basic " + user:password as a base64 encoded string
        req.bosAuthenticationData = {type: 'Basic', securityReq: securityReq};
        var authHeader = req.get('authorization') ? req.get('authorization') : '';
        if (authHeader !== '') {
            var credentialsBase64 = authHeader.split('Basic ')[1];
            var credentialsDecoded = base64URL.decode(credentialsBase64);
            var credentials = credentialsDecoded.split(':');
            req.bosAuthenticationData.username = credentials[0];
            req.bosAuthenticationData.password = credentials[1];
        }
        if (!(req.bosAuthenticationData.username && req.bosAuthenticationData.password)) {
            res.setHeader('WWW-Authenticate', 'Basic realm="' + securityReq + '"');
            //dont send 401 response yet, as user may want to provide additional info in the response
        }
        next();
    };
}

function apiKeyAuthentication(securityReq, securityDefn) {
    return function (req, res, next) {
        if (req.bosAuthenticationData && !res.getHeader('WWW-Authenticate')) { //already authenticated
            return next();
        }
        req.bosAuthenticationData = {type: 'apiKey', securityReq: securityReq};
        if (req.get('authorization')) {
            var digestHeader = req.get('authorization').split('Digest ')[1];
            if (digestHeader) {
                //should be form of username="Mufasa", realm="myhost@example.com"
                //treating this like the digest scheme defined in the rfc
                var authorizationHeaderFields = digestHeader.split(', ');
                authorizationHeaderFields.forEach(function (header) {
                    //should be form of username="Mufasa"
                    var keyValPair = header.split('=');
                    req.bosAuthenticationData[keyValPair[0]] = keyValPair[1].substring(1, keyValPair[1].length - 1);
                });
            }
        }
        if (securityDefn.in === 'query') {
            req.bosAuthenticationData.password = req.query[securityDefn.name];
        }
        else if (securityDefn.in === 'header') {
            req.bosAuthenticationData.password = req.get(securityDefn.name);
        }
        else {
            log.warn('unknown location %s for apiKey. ' +
                'looks like open api specs may have changed on us', securityDefn.in);
        }
        if (!(req.bosAuthenticationData.password)) {
            res.setHeader('WWW-Authenticate', 'Digest realm="' + securityReq + '"');
            //dont send 401 response yet, as user may want to provide additional info in the response
        }
        next();
        //this would have to be a user provided function that
        //fetches the user (and thus the private key that we need to compute the hash) from some data source
        //we don't need this if we decide that we will let the user figure out how to verify the digest
        /*verify(apiId, function (user) {
         //regenerate hash with apiKey
         //hash will include symmetric apiKey, one or more of:
         //request method, content-md5 header, request uri, timestamp, socket.remoteAddress, req.ip, ip whitelist?
         //if (hash === digest)
         //  all good
         // else you suck
         req.bosAuth.user = user;
         next();
         });*/
    };
}

function oauth2(securityReq, securityDefn, scopes) {
    return function (req, res, next) {
        if (securityDefn.flow === 'accessCode') {
            if (!req.session) {
                log.error('oauth requires that session be enabled');
                return next();
            }
            if (req.session.bosAuthenticationData) { //already authenticated
                return next();
            }
        } else if (req.get('authorization')) { //implicit
            req.bosAuthenticationData.password =
                req.get('authorization').split('Bearer ')[1]; //we assume bearer token type which is the most common
            if (req.bosAuthenticationData.password) { //already authenticated
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
}

/*function _expandRouteInstancePermissions(perms, route, uri) {
     relate the route path parameters to the url instance values
     perms: ["api:read:{policyid}", "api:read:{claimid}"]
     route: /api/v1/policies/:policyid/claims/:claimid
     [ api,v1,policies,:policyid,claims,:claimid ]
     uri:   /api/v1/policies/SFIH1234534/claims/37103
     [ api,v1,policies,SFIH1234534,claims,37103 ]

    if (!_.isString(route) ||  !_.isString(uri)) {
        return perms;
    }
    var routeParts = route.split('/');
    var uriParts = uri.split('/');

    // [ [ ':policyid', 'SFIH1234534' ], [ ':claimid', '37103' ] ]
    var pathIds = _.zip(routeParts, uriParts)
        .filter(function (b) {
            return _.startsWith(b[0], ':');
        }).map(function (path) {
            // trim the :
            path[0] = path[0].substr(1);
            return path;
        });

    return _.map(perms, function (perm) {
        var ePerm = perm;
        _.forEach(pathIds, function (item) {
            ePerm = ePerm.replace('{' + item[0] + '}', item[1]);
        });
        return ePerm;
    });
}*/

//swagger paths use {blah} while express uses :blah
function _convertPathToExpress(swaggerPath) {
    var reg = /\{([^\}]+)\}/g;  //match all {...}
    swaggerPath = swaggerPath.replace(reg, ':$1');
    return swaggerPath;
}
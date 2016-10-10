var _ = require('lodash');
var base64URL = require('base64url');

var log;
var loader;
var oAuthService;
var httpMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];
var passportEnabled;

module.exports = {
    init : init
};

function init(app, config, logger, serviceLoader, swagger) {
    passportEnabled = config.get('passport').enabled;
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
                        _.keys(operation['security']).forEach(function (securityReq) {
                            _applySecurityRequirement(app, method, routePath, securityReq,
                                api.securityDefinitions[securityReq], /*operation['x-bos-permissions'][securityReq],*/
                                operation['security'][securityReq]);
                        });
                    }
                }
            });
        });
    });
}

function _applySecurityRequirement(app, method, route, securityReq,
                                   securityDefn, /*requiredPermissions,*/ requiredScopes) {
    if (passportEnabled) {
        var passportService = loader.get('bosPassport');
        passportService.authenticate(securityReq);
    } else { //need to check for an active session here as well, because if there is one we want to skip all of this
        var scheme = securityDefn.type;
        switch (scheme) {
        case 'basic':
            app[method].call(app, route, basicExtractor());
            break;
        case 'apiKey': //may also need a user provided 'verify' function here
            app[method].call(app, route, apiKeyExtractor(securityDefn));
            break;
        case 'oauth2':
            if (!oAuthService) {
                oAuthService = loader.get('oauth2');
            }
            app[method].call(app, route, oauth2(route, securityDefn, requiredScopes));
            break;
        default:
            return log.warn('unrecognized security scheme %s for route %s', scheme, route);
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

function basicExtractor() {
    return function (req, res, next) {
        //if there is no auth header present, send back challenge 401 with www-authenticate header?
            //now that I think about this, think this should be handled by user defined code
            //because their is no way for us to know how to set the header fields (i.e. realm)
        //header should be of the form "Basic " + user:password as a base64 encoded string
        var authHeader = req.headers['Authorization'];
        var credentialsBase64 = authHeader.substring(authHeader.split('Basic ')[1]);
        var credentials = base64URL.decode(credentialsBase64).split(':');
        req.bos.authenticationData = {username: credentials[0], password: credentials[1], scheme: 'Basic'};
        next();
    };
}

function apiKeyExtractor(securityDefn) {
    //if there is no apiKey present, send back challenge 401 with www-authenticate header?
        //now that I think about this, think this should be handled by user defined code
        //because their is no way for us to know how to set the header fields (i.e. realm)
    return function (req, res, next) {
        //should be form of username="Mufasa", realm="myhost@example.com"
        var authorizationHeaders = req.headers['Authorization'].split(', ');
        var authenticationData = {scheme: 'apiKey'};
        authorizationHeaders.forEach(function (header) {
            //should be form of username="Mufasa"
            var keyValPair = header.split('=');
            authenticationData[keyValPair[0]] = keyValPair[1].substring(1, keyValPair[1].length - 1);
        });
        if (securityDefn.in === 'query') {
            authenticationData.password = req.query[securityDefn.name];
        } else if (securityDefn.in === 'header') {
            authenticationData.password = req.headers[securityDefn.name];
        } else {
            return log.warn('unknown location %s for apiKey. ' +
                'looks like open api specs may have changed on us', securityDefn.in);
        }
        req.bos.authenticationData = authenticationData;
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

function oauth2(route, securityDefn, scopes) {
    return function (req, res, next) {
        var oAuthInstance = oAuthService.getOAuthInstance(route);
        if (!oAuthInstance) {
            oAuthInstance = new oAuthService.OAuth2(securityDefn.authorizationUrl,
                securityDefn.flow, securityDefn.tokenUrl, securityDefn.scopes);
            oAuthService.addOAuthInstance(route, oAuthInstance);
        }
        oAuthInstance.startOAuth(req, res);
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
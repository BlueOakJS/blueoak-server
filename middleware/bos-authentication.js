var _ = require('lodash');

var config;
var log;
var loader;
var httpMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];

module.exports = {
    init : init
};

function init(app, config, logger, serviceLoader, swagger) {
    config = config.get('authentication');
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
                                api.securityDefinitions[securityReq], operation['x-bos-permissions'][securityReq],
                                operation['security'][securityReq]);
                        });
                    }
                }
            });
        });
    });
}

function _applySecurityRequirement(app, method, route, securityReq, securityDefn, requiredPermissions, requiredScopes) {
    //wire up path with user defined authentication method for this req
    if (config.authenticationMethods[securityReq]) {
        var parts = config.authenticationMethods[securityReq].split('.');
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
        if (config.authorizationMethods[securityReq]) {
            parts = config.authorizationMethods[securityReq].split('.');
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
    }
}

function wrapAuthorizationMethod(authorizationMethod, route, securityDefn, requiredPermissions) {
    return function (req, res, next) {
        var runTimeRequiredPermissions = _expandRouteInstancePermissions(requiredPermissions, route, req.path);
        authorizationMethod.call(this, req, res, next, securityDefn, runTimeRequiredPermissions);
    };
}

function _expandRouteInstancePermissions(perms, route, uri) {
    /* relate the route path parameters to the url instance values
     perms: ["api:read:{policyid}", "api:read:{claimid}"]
     route: /api/v1/policies/:policyid/claims/:claimid
     [ api,v1,policies,:policyid,claims,:claimid ]
     uri:   /api/v1/policies/SFIH1234534/claims/37103
     [ api,v1,policies,SFIH1234534,claims,37103 ]
     */
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
}

//swagger paths use {blah} while express uses :blah
function _convertPathToExpress(swaggerPath) {
    var reg = /\{([^\}]+)\}/g;  //match all {...}
    swaggerPath = swaggerPath.replace(reg, ':$1');
    return swaggerPath;
}
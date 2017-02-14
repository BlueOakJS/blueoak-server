/*
 * Copyright (c) 2016-2017 PointSource, LLC.
 * MIT Licensed
 */
var _ = require('lodash'),
    basicAuth = require('basic-auth'),
    util = require('util'),
    VError = require('verror');

var log;
var loader;

var httpMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];
var swaggerSecuritySchemeKeys = [
    'type',
    'name',
    'in',
    'flow',
    'authorizationUrl',
    'tokenUrl',
    'scopes'
];

var securityDefinitions = {},
    securityValidatorOptions = {};

module.exports = {
    init: init
};

function init(app, logger, serviceLoader, swagger) {
    log = logger;
    loader = serviceLoader;
    _.forOwn(swagger.getSimpleSpecs(), function (api, apiName) {
        initializeSecurityDefinitions(api, apiName);
        
        var basePath = api.basePath || '';
        var globalSecurityRequirements = api.security || [];
        
        // apply security requirements to each route path
        _.forOwn(api.paths, function (pathDefinition, path) {
            var routePath = basePath + convertSwaggerPathToExpressPath(path);

            // and each HTTP method on that path
            httpMethods.forEach(function (method) {
                if (pathDefinition[method]) {
                    var methodSecurityRequirements = pathDefinition[method].security || globalSecurityRequirements,
                        methodValidatorOptions = getMergedValidatorOptions(
                            pathDefinition[method]['x-bos-security-validator-options']);
                    applySecurityRequirements(app, method, routePath,
                                               methodSecurityRequirements, methodValidatorOptions);
                }
            });
        });
    });
}

function initializeSecurityDefinitions(api, apiName) {
    _.forOwn(api.securityDefinitions, function (scheme, schemeName) {
        var validationFn;
        if (securityDefinitions[schemeName]) {
            // we've already initialized it
            log.info('Skipping initialization for reused security scheme %s from API %s for API %s',
                schemeName, scheme.api, apiName);
            return;
        } else if (!(_.has(scheme, 'x-bos-validator.service') && _.has(scheme, 'x-bos-validator.function'))) {
            // no validation function has been specified
            log.warn('No validation service/function has been specified for security scheme %s.', schemeName);
        } else {
            var serviceName = _.get(scheme, 'x-bos-validator.service'),
                functionName = _.get(scheme, 'x-bos-validator.function');
            var service = loader.getConsumer('services', serviceName);
            if (!service) {
                log.warn('Validator service %s not found for security scheme %s',
                    serviceName, schemeName);
            } else if (!_.isFunction(service[functionName])) {
                log.warn('Validator function %s for security scheme %s is not a function',
                    serviceName, schemeName);
            } else {
                validationFn = service[functionName];
            }
        }
        
        securityDefinitions[schemeName] = {
            api: apiName,
            config: _.pick(scheme, swaggerSecuritySchemeKeys),
            options: _.get(scheme, 'x-bos-validator.options'),
            validator: validationFn
        };
        securityValidatorOptions[schemeName] = securityDefinitions[schemeName].options;
        
        if (!validationFn) {
            log.warn('No security validation will be performed for API methods using scheme %s.\n' +
                'Add valid "x-bos-validator.service" (BOS service name with the validator function) ' +
                'and "x-bos-validator.function" (the function name) fields to your %s spec to enable.)',
                schemeName, apiName);
        }
    });
}

function getMergedValidatorOptions(pathOverride) {
    return _.merge({}, securityValidatorOptions, pathOverride, function (globalValue, pathValue) {
        if (_.isArray(globalValue)) {
            // if there is an array value, we want to override it, not merge it
            return pathValue;
        }
    });
}

function applySecurityRequirements(app, method, routePath, methodSecurityRequirements, methodValidatorOptions) {
    if (methodSecurityRequirements.length === 0) {
        return;
    }

    // add the defined method security requirements
    var securityChecks = _.map(methodSecurityRequirements, function (methodRequirement) {
        var schemeName = _.keys(methodRequirement)[0],
            checker;
        switch (securityDefinitions[schemeName].type) {
        case 'basic':
            checker = basicSecurity(schemeName, methodRequirement, methodValidatorOptions[schemeName]);
            break;
        case 'apiKey':
            checker = apiKeySecurity(schemeName, methodRequirement, methodValidatorOptions[schemeName]);
            break;
        case 'oauth2':
            checker = oauth2Security(schemeName, methodRequirement, methodValidatorOptions[schemeName]);
            break;
        default:
            log.warn('Skipping unrecognized security type "%s" for security definition "%s".\n' +
                securityDefinitions[schemeName].type, schemeName);
            checker = function () { };
            break;
        }
        checker.scheme = schemeName;
        return checker;
    }, []);
    
    // add one more to prevent this route being accessed if none of them rejects it directly or authorizes it explicitly
    app[method].call(app, routePath, authorizedRequest(securityChecks));
}

function authorizedRequest(securityChecks) {
    return function (req, res, next) {
        req.bosSecurity = {
            authorized: false
        };
        
        var i = 0;
        return securityChecks[i](req, _handleSecurityCheckResult);
    
        function _handleSecurityCheckResult(err, user) {
            if (err) {
                req.bosSecurity.scheme = securityChecks[i].scheme;
                
                var challenge = err.challenge || err.message;
                return next(new SecurityRequirementError(challenge, err));
            } else if (user) {
                req.bosSecurity.authorized = true;
                req.bosSecurity.scheme = securityChecks[i].scheme;
                req.bosSecurity.user = user;
                
                // req.user is a common place for express.js apps to put their user objects
                // but if something is already there, we're not going to trample it
                if (!req.user) {
                    req.user = user;
                }
                
                return next();
            } else {
                i++;
                if (i < securityChecks.length) {
                    securityChecks[i](req, _handleSecurityCheckResult);
                } else {
                    // we've done all the configured security checks, but none of them authorized or rejected it
                    // we can't let the request proceed, and don't have a realm, so it'll be a 403
                    return next(new SecurityRequirementError());
                }
            }
            
        }
    };
}

function basicSecurity(schemeName, securityRequirements, validatorOptions) {
    return function (req, callback) {
        var credentials = basicAuth(req);
        if (credentials) {
            return securityRequirements.validator(req, credentials, validatorOptions || {}, function (err, user) {
                if (err && !err.challenge) {
                    err.challenge = util.format('Basic realm="%s"', schemeName);
                }
                return callback(err, user);
            });
        } else {
            return callback();
        }
    };
}

function apiKeySecurity(schemeName, securityRequirements, validatorOptions) {
    return function (req, callback) {
        var apiKey,
            securityDefinition = securityRequirements.config;
        
        if (securityDefinition.in === 'query') {
            apiKey = req.query[securityDefinition.name];
        }
        else if (securityDefinition.in === 'header') {
            var headerMatch = (new RegExp('^\\s*' + schemeName + '\\s+(.+)$', 'i'))
                .exec(req.get(securityDefinition.name));
            if (headerMatch) {
                apiKey = headerMatch[1];
            }
        }
        
        if (apiKey) {
            return securityRequirements.validator(req, apiKey, validatorOptions || {}, function (err, user) {
                if (err && !err.challenge) {
                    err.challenge = schemeName;
                }
                return callback(err, user);
            });
        } else {
            return callback();
        }
    };
}

function oauth2Security(schemeName, securityRequirements, validatorOptions) {
    return function (req, callback) {
        return securityRequirements.validator(req, securityRequirements.config, validatorOptions || {}, callback);
    };
}

//swagger paths use {blah} while express uses :blah
function convertSwaggerPathToExpressPath(swaggerPath) {
    var reg = /\{([^\}]+)\}/g;  //match all {...}
    var expressPath = swaggerPath.replace(reg, ':$1');
    return expressPath;
}


function SecurityRequirementError(challenge, cause) {
    var errorInfo = {
        name: 'SecurityError',
        cause: cause,
        info: {
            challenge: challenge
        }
    };
    SecurityRequirementError.super_.call(this, errorInfo, (challenge ? 'Unauthorized' : 'Forbidden'));
}
util.inherits(SecurityRequirementError, VError);
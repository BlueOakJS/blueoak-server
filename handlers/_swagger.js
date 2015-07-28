/* Copyright © 2015 PointSource, LLC. All rights reserved. */
var _ = require('lodash'),
    parser = require('swagger-parser'),
    path = require('path'),
    async = require('async'),
    fs = require('fs'),
    swaggerUtil = require('../lib/swaggerUtil'),
    VError = require('verror');


var httpMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];

exports.init = function (app, auth, config, logger, serviceLoader, callback) {
    var cfg = config.get('swagger');

    //default to true
    var useBasePath = cfg.useBasePath || cfg.useBasePath === undefined;

    var swaggerDir = path.resolve(global.__appDir, 'swagger');
    var files = [];

    try {
        fs.readdirSync(swaggerDir).forEach(function (fileName) {
            //look for json and yaml
            if (path.extname(fileName) === '.json') {
                files.push(path.resolve(swaggerDir, fileName));
            } else if (path.extname(fileName) === '.yaml') {
                files.push(path.resolve(swaggerDir, fileName));
            }
        });
    } catch (err) {
        //swagger dir probably doesn't exist
        return callback();
    }

    //Loop through all our swagger models
    //For each model, parse it, and automatically hook up the routes to the appropriate handler
    async.eachSeries(files, function parseSwagger(file, swagCallback) {

        parser.parse(file, function (err, api, metadata) {

            if (err && path.extname(file) === '.yaml') {
                return swagCallback(err);
            }

            if (err) {
                //Was this an actual swagger file?  Could just be a partial swagger pointed to by a $ref
                try {
                    var json = JSON.parse(fs.readFileSync(file));

                    //valid JSON
                    if (isSwaggerFile(json)) {
                        //this must be a swagger file, but it doesn't validate. fail
                        return swagCallback(err);
                    }
                } catch (err) {
                    //wasn't even valid JSON, error out
                    return swagCallback(err);
                }
                logger.warn('Skipping %s', file);
                return swagCallback();
            }

            var handlerName = path.basename(file); //use the swagger filename as our handler module id
            handlerName = handlerName.substring(0, handlerName.lastIndexOf('.')); //strip extensions

            var basePath = api.basePath || '';

            _.keys(api.paths).forEach(function (path) {
                var data = api.paths[path];
                var routePath = convertPathToExpress(path);

                if (useBasePath) {
                    routePath = basePath + routePath;
                }

                if (data["x-handler"]) {
                    handlerName = data["x-handler"];
                }

                //loop for http method keys, like get an post
                _.keys(data).forEach(function (key) {
                    if (_.contains(httpMethods, key)) {
                        var methodData = data[key];
                        if (!methodData.operationId) {
                            return logger.warn('Missing operationId in route "%s"', routePath);
                        }

                        var handlerMod = serviceLoader.getConsumer('handlers', handlerName);
                        if (!handlerMod) {
                            return logger.warn('Could not find handler module named "%s".', handlerName);
                        }

                        var handlerFunc = handlerMod[methodData.operationId];
                        if (!handlerFunc) {
                            return logger.warn('Could not find handler function "%s" for module "%s"', methodData.operationId, handlerName);
                        }


                        //Look for custom middleware functions defined on the handler path
                        var additionalMiddleware = [];
                        var middlewareList = methodData['x-middleware'];
                        if (middlewareList) {
                            if (!_.isArray(middlewareList)) {
                                middlewareList = [middlewareList]; //turn into an array
                            }
                            middlewareList.forEach(function (mwName) {
                                //middleware can either be of form <handler.func>
                                //or just <func> in which case the currently handler is used
                                var parts = mwName.split('.');
                                if (parts.length === 1) {
                                    parts = [handlerName, parts[0]];
                                }

                                var mwHandlerMod = serviceLoader.getConsumer('handlers', parts[0]);
                                if (!mwHandlerMod) {
                                    return logger.warn('Could not find middleware handler module named "%s".', parts[0]);
                                }
                                if (mwHandlerMod[parts[1]]) {
                                    additionalMiddleware.push(mwHandlerMod[parts[1]]); //add the mw function
                                } else {
                                    return logger.warn('Could not find middleware function "%s" on module "%s".', parts[1], parts[0])
                                }
                            });
                        }

                        logger.debug('Wiring up route %s %s to %s.%s', key, routePath, handlerName, methodData.operationId);
                        registerRoute(app, auth, additionalMiddleware, key, routePath, methodData, methodData.produces || api.produces || null, handlerFunc, logger);

                    }
                });

            });
            swagCallback();
        });
    }, function (err) {
        return callback(err);
    });


};

//Try to determine if this is supposed to be a swagger file
//For now look for the required "swagger" field, which contains the version
function isSwaggerFile(json) {
    return json.swagger;
}

/**
 * app - express app
 * auth - auth service
 * additionalMiddleware - list of other middleware callbacks to register
 * method - get, post, put, etc.
 * path - /swagger/path
 * data - swagger spec associated with the path
 * allowedTypes - the 'produces' data from the swagger spec
 * handlerFunc - handler callback function
 * logger - the logger service
 */
function registerRoute(app, auth, additionalMiddleware, method, path, data, allowedTypes, handlerFunc, logger) {
    var authMiddleware = auth.getAuthMiddleware() || [];
    additionalMiddleware = authMiddleware.concat(additionalMiddleware);
    app[method].call(app, path, additionalMiddleware, function (req, res, next) {

        validateParameters(req, data, logger, function (err) {
            if (err) {
                return next(err);
            }
            setDefaultQueryParams(req, data, logger);
            setDefaultHeaders(req, data, logger);

            //Wrap the set function, which is responsible for setting headers
            if (allowedTypes) {
                //Validate that the content-type is correct per the swagger definition
                wrapCall(res, 'set', function (name, value) {
                    if (name === 'Content-Type') {
                        var type = value.split(';')[0]; //parse off the optional encoding
                        if (!_.contains(allowedTypes, type)) {
                            logger.warn('Invalid content type specified: ' + type + '. Expecting one of ' + allowedTypes);
                        }
                    }
                });
            }

            handlerFunc(req, res, next);
        });

    });
}

//Any parameter with a default that's not already defined will be set to the default value
function setDefaultQueryParams(req, data, logger) {
    var parameters = _.toArray(data.parameters);
    for (var i = 0; i < parameters.length; i++) {
        var parm = parameters[i];
        if (parm.in === 'query') {
            if (parm.default && typeof(req.query[parm.name]) === 'undefined') {
                req.query[parm.name] = swaggerUtil.cast(parm, parm.default);
            }
        }
    }
}

//Any header with a default that's not already defined will be set to the default value
function setDefaultHeaders(req, data, logger) {
    var parameters = _.toArray(data.parameters);
    for (var i = 0; i < parameters.length; i++) {
        var parm = parameters[i];
        if (parm.in === 'header') {
            if (parm.default && typeof(req.query[parm.name]) === 'undefined') {
                req.headers[parm.name] = swaggerUtil.cast(parm, parm.default);
            }
        }
    }
}


function validateParameters(req, data, logger, callback) {

    var parameters = _.toArray(data.parameters);
    for (var i = 0; i < parameters.length; i++) {
        var parm = parameters[i];

        if (parm.in === 'query') {

            if (parm.required && typeof(req.query[parm.name]) === 'undefined') {
                logger.warn('Missing query parameter "%s" for operation "%s"', parm.name, data.operationId);
                var error = new VError('Missing %s query parameter', parm.name);
                error.name = 'ValidationError';
                return callback(error);

            } else if (typeof req.query[parm.name] !== 'undefined') {
                var result = swaggerUtil.validateParameterType(parm, req.query[parm.name]);

                if (!result.valid) {
                    var error = new VError('Error validating query parameter %s', parm.name);
                    error.name = 'ValidationError';
                    error.subErrors = result.errors;
                    return callback(error);
                }
            }

        } else if (parm.in === 'header') {

            if (parm.required && typeof(req.get(parm.name)) === 'undefined') {
                logger.warn('Missing header "%s" for operation "%s"', parm.name, data.operationId);
                var error = new VError('Missing %s header', parm.name);
                error.name = 'ValidationError';
                return callback(error);

            } else if (typeof req.get(parm.name) !== 'undefined') {
                var result = swaggerUtil.validateParameterType(parm, req.get(parm.name));

                if (!result.valid) {
                    var error = new VError('Error validating %s header', parm.name);
                    error.name = 'ValidationError';
                    error.subErrors = result.errors;
                    return callback(error);
                }
            }

        } else if (parm.in === 'path') {

            var result = swaggerUtil.validateParameterType(parm, req.params[parm.name]);
            if (!result.valid) {
                var error = new VError('Error validating %s path parameter', parm.name);
                error.name = 'ValidationError';
                error.subErrors = result.errors;
                return callback(error);
            }

        } else if (parm.in === 'formData') {
            //TODO: validate form data
            logger.warn('Form data validation is not yet supported');
        } else if (parm.in === 'body') {
            var result = swaggerUtil.validateJSONType(parm.schema, req.body);

            if (!result.valid) {
                var error = new VError('Error validating request body');
                error.name = 'ValidationError';
                error.subErrors = result.errors;
                return callback(error);
            }
        }
    }
    return callback();
}

function wrapCall(obj, funcName, toCall) {
    var origFunc = obj[funcName];
    obj[funcName] = function () {
        toCall.apply(obj, arguments);
        return origFunc.apply(obj, arguments);
    };
}

//swagger paths use {blah} while express uses :blah
function convertPathToExpress(swaggerPath) {
    var reg = /\{([^\}]+)\}/g;  //match all {...}
    swaggerPath = swaggerPath.replace(reg, ':$1');
    return swaggerPath;
}
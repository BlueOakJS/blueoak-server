/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var _ = require('lodash'),
    swaggerUtil = require('../lib/swaggerUtil'),
    VError = require('verror'),
    multer = require('multer');

var _upload; //will get set to a configured multer instance if multipart form data is used
var httpMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];

exports.init = function (app, auth, config, logger, serviceLoader, swagger, callback) {
    var cfg = config.get('swagger');

    //default to true
    var useBasePath = cfg.useBasePath || cfg.useBasePath === undefined;

    var serveSpec = cfg.serve;
    var useLocalhost = cfg.useLocalhost;
    var context = cfg.context;

    var specs = swagger.getPrettySpecs();
    _.keys(specs).forEach(function(specName) {
        var api = specs[specName];

        //wire up serving the spec from <host>/swagger/<filename_without_extension>
        if (serveSpec) {

            var route = context + '/' + specName; //strip extension
            logger.debug('Serving swagger spec at %s', route);

            var apiToServe = _.cloneDeep(api); //clone it since we'll be modifying the host

            //We swap the default host
            if (useLocalhost) {
                apiToServe.host = 'localhost:' + config.get('express').port;
            }

            if (!useBasePath) {
                apiToServe.basePath = '/';
            }

            app.get(route, function(req, res) {
                res.json(apiToServe);
            });
        }

        if (containsMultipartFormData(api)) {

            //make sure we have the config for multer
            if (_.keys(config.get('multer')).length === 0) {
                logger.warn('No multer config found.  Required when using multipart form data.');
            } else {
                _upload = multer(config.get('multer'));
            }
        }

        var basePath = api.basePath || '';
        var handlerName = specName;

        _.keys(api.paths).forEach(function (path) {
            var data = api.paths[path];
            var routePath = convertPathToExpress(path);

            if (useBasePath) {
                routePath = basePath + routePath;
            }

            if (data['x-handler']) {
                handlerName = data['x-handler'];
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
                                return logger.warn('Could not find middleware function "%s" on module "%s".', parts[1], parts[0]);
                            }
                        });
                    }

                    logger.debug('Wiring up route %s %s to %s.%s', key, routePath, handlerName, methodData.operationId);
                    registerRoute(app, auth, additionalMiddleware, key, routePath, methodData, methodData.produces || api.produces || null, handlerFunc, logger);

                }
            });

        });

    });

    callback();

};


//determine if something in the spec uses formdata
//The entire api can contain a consume field, or just an individual route
function containsMultipartFormData(api) {
    if (_.indexOf(api.consumes, 'multipart/form-data') > -1) {
        return true;
    }

    var foundMultipartData = false;
    _.keys(api.paths).forEach(function(path) {
        var pathData = api.paths[path];
        _.keys(pathData).forEach(function(method) {
            if (_.indexOf(pathData[method].consumes, 'multipart/form-data') > -1) {
                foundMultipartData = true;
                return;
            }
        });
        if (foundMultipartData) {
            return;
        }

    });

    return foundMultipartData;
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


    if (containsFormData(data)) {
        var fieldData = _.where(data.parameters, {in: 'formData', type: 'file'});
        fieldData = _.map(fieldData, function(item) {
            return {
                name: item.name,
                maxCount: 1
            };
        });

        additionalMiddleware.push(_upload.fields(fieldData));
    }

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

//Check if a given route contains any formData parameters
function containsFormData(routeData) {
    return _.where(routeData.parameters, {in: 'formData'}).length > 0;
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
            //fyi, the swagger parser will fail if the user didn't set consumes to multipart/form-data or application/x-www-form-urlencoded

            if (parm.required && parm.type === 'file') {
                if (!req.files[parm.name]) {
                    logger.warn('Missing form parameter "%s" for operation "%s"', parm.name, data.operationId);
                    var error = new VError('Missing %s form parameter', parm.name);
                    error.name = 'ValidationError';
                    return callback(error);
                }
            } else if (parm.required) { //something other than file
                if (!req.body[parm.name]) { //multer puts the non-file parameters in the request body
                    logger.warn('Missing form parameter "%s" for operation "%s"', parm.name, data.operationId);
                    var error = new VError('Missing %s form parameter', parm.name);
                    error.name = 'ValidationError';
                    return callback(error);
                } else {
                    //go through the param-parsing code which is able to take text and validate
                    //it as any type, such as number, or array
                    var result = swaggerUtil.validateParameterType(parm, req.body[parm.name]);
                    if (!result.valid) {
                        var error = new VError('Error validating form parameter %s', parm.name);
                        error.name = 'ValidationError';
                        error.subErrors = result.errors;
                        return callback(error);
                    }
                }
            }

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
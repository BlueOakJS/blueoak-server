/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var _ = require('lodash'),
    swaggerUtil = require('../lib/swaggerUtil'),
    VError = require('verror'),
    multer = require('multer'),
    util = require('util');

// config Enum for when multer.storage property matches,
// we set to multe.storage config to multer.memoryStorage()
var MULTER_MEMORY_STORAGE = 'multerMemoryStorage';

var _upload; //will get set to a configured multer instance if multipart form data is used
var httpMethods;
var responseModelValidationLevel;
var polymorphicValidation;

exports.init = function (app, auth, config, logger, serviceLoader, swagger, callback) {
    var cfg = config.get('swagger');

    responseModelValidationLevel = swagger.getResponseModelValidationLevel();
    polymorphicValidation = swagger.isPolymorphicValidationEnabled();
    httpMethods = swagger.getValidHttpMethods();

    //default to true
    var useBasePath = cfg.useBasePath || cfg.useBasePath === undefined;
    var serveSpec = cfg.serve;
    var useLocalhost = cfg.useLocalhost;
    var context = cfg.context;

    var specs = swagger.getSimpleSpecs(); //this gets used for validation
    var prettySpec = swagger.getPrettySpecs(); //this is what we serve

    _.keys(specs).forEach(function(specName) {
        var api = specs[specName];

        //wire up serving the spec from <host>/swagger/<filename_without_extension>
        if (serveSpec) {

            var route = context + '/' + specName; //strip extension
            logger.debug('Serving swagger spec at %s', route);

            var apiToServe = _.cloneDeep(prettySpec[specName]); //clone it since we'll be modifying the host

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
                var multerConfig = handleMulterConfig(config.get('multer'), logger, serviceLoader);
                _upload = multer(multerConfig);
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
                    registerRoute(app, auth, additionalMiddleware, key, routePath, methodData, methodData.produces || api.produces || null, handlerFunc, api, logger);

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

// Checks the multer config if the storage property is set to either the
// memoryStorage enum or the name of a custom multerService implementing
// a multer storage engine.
function handleMulterConfig(multerConfig, logger, serviceLoader) {
    // Special handling of storage
    var storageString = _.get(multerConfig, 'storage');
    if (storageString) {
        var multerStorage;
        if (storageString === MULTER_MEMORY_STORAGE) {
            // simple memory storage
            logger.debug('loading simple multer memoryStorage');
            multerStorage = multer.memoryStorage();
        } else {
            // otherwise try and load the service for custom multer storage engine
            logger.debug('loading custom multer storage service');
            var multerService = serviceLoader.get(storageString);
            if (!multerService) {
                logger.warn('Multer config "storage" property must either be "' + MULTER_MEMORY_STORAGE + '"');
                logger.warn('or the name of a service that returns a multer storage engine');
            } else {
                multerStorage = multerService.storage;
            }
        }
        _.set(multerConfig, 'storage', multerStorage);
    }

    return multerConfig;
}

function isValidDataType(body) {
    if (typeof body === 'object') {
        return true;
    } else if (Array.isArray(body)) {
        if (body.length === 0) {
            return true;
        } else if (typeof body[0] === 'object') {
            return true;
        }
    } else if (!body) {
        return true;
    }
    return false;
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
 * swaggerDoc - root swagger document for this api
 * logger - the logger service
 */
function registerRoute(app, auth, additionalMiddleware, method, path, data, allowedTypes, handlerFunc, swaggerDoc, logger) {
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

        validateRequestParameters(req, data, swaggerDoc, logger, function (err) {
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

            if (responseModelValidationLevel) {
                var responseSender = res.send;
                res.send = function (body) {
                    var isBodyValid = isValidDataType(body);
                    if (!isBodyValid) {
                        try { //body can come in as JSON, we want it unJSONified
                            body = JSON.parse(body);
                        } catch (err) {
                            logger.error('Unexpected format when attempting to validate response');
                            res.send = responseSender;
                            responseSender.call(res, body);
                            return;
                        }
                    }
                    var validationErrors = validateResponseModels(res, body, data, swaggerDoc, logger);
                    // we're going to check the model for any validation errors, and handle them based on the validation level
                    if (validationErrors) {
                        // 'error'
                        // errors added in the `_response_validation_errors` property of the response,
                        // or of that property of the first and last array entries
                        // we'll create a response object (or array entry) if there isn't one (we will break some client code)
                        var alteredBody;
                        if (responseModelValidationLevel === 'error') {
                            var invalidBodyDetails = _.cloneDeep(validationErrors);
                            alteredBody = _.cloneDeep(body);
                            if (Array.isArray(alteredBody)) {
                                if (alteredBody.length === 0) {
                                    alteredBody.push(invalidBodyDetails);
                                } else {
                                    alteredBody[0]._response_validation_errors = invalidBodyDetails;
                                    if (alteredBody.length > 1) {
                                        alteredBody[alteredBody.length - 1]._response_validation_errors = invalidBodyDetails;
                                    }
                                }
                            } else {
                                alteredBody = alteredBody || {};
                                alteredBody._response_validation_errors = invalidBodyDetails;
                            }
                        }
                        
                        // 'warn'
                        // response is sent back to the caller unmodified, errors (this model here) are only logged (see below)
                        validationErrors.invalidResponse = {
                            method: req.method,
                            path: req.path,
                            statusCode: res.statusCode,
                            body: body || null
                        };
                        
                        // 'fail'
                        // changes the actual http response code to 522 and separates out the validation errors and response body.
                        // Will break client code, so this should only be used when developing/testing an API in stand alone
                        if (responseModelValidationLevel === 'fail') {
                            body = validationErrors;
                            res.statusCode = validationErrors.status;
                        } else if (alteredBody) {
                            body = alteredBody;
                        }
                        
                        // in all cases, log the validation errors
                        logger[responseModelValidationLevel === 'warn' ? 'warn' : 'error']
                            ('Response validation error:', JSON.stringify(validationErrors, null, 2));
                    }

                    // after this initial call (sometimes `send` will call itself again), we don't need to get the response for validation anymore
                    res.send = responseSender;
                    responseSender.call(res, isBodyValid ? body: JSON.stringify(body)); // if we unJSONified at the beginning, reJSONify

                };
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


function validateRequestParameters(req, data, swaggerDoc, logger, callback) {

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
            var polymorphicValidationErrors = [];
            if (polymorphicValidation !== 'off') {
                polymorphicValidationErrors = swaggerUtil.validateIndividualObjects(swaggerDoc, parm['x-bos-generated-disc-map'], req.body);
                if (polymorphicValidationErrors.length > 0 && polymorphicValidation === 'warn') {
                    var warning = {
                        errors: polymorphicValidationErrors,
                        body: body || null
                    };
                    logger.warn('Request body polymorphic validation error for %s %s:', req.method, req.path, JSON.stringify(warning, null, 2));
                    polymorphicValidationErrors = [];
                }
            }
            if (!result.valid || polymorphicValidationErrors.length > 0) {
                var error = new VError('Error validating request body');
                error.name = 'ValidationError';
                error.subErrors = result.errors.concat(polymorphicValidationErrors);
                return callback(error);
            }
        }
    }
    return callback();
}

function validateResponseModels(res, body, data, swaggerDoc, logger) {
    if (!(res.statusCode >= 200 && res.statusCode < 300 || res.statusCode >= 400 && res.statusCode < 500)) {
        //the statusCode for the response isn't in the range that we'd expect to be documented in the swagger
        //i.e.: 200-299 (success) or 400-499 (request error)
        return;
    }

    var schemaPath = 'responses.%s.schema',
        mapPath = 'responses.%s.x-bos-generated-disc-map',
        codeSchema = util.format(schemaPath, res.statusCode),
        defaultSchema = util.format(schemaPath, 'default'),
        mapSchema = util.format(mapPath, res.statusCode),
        defaultMapSchema = util.format(mapPath, 'default');
    var modelSchema;
    var responseModelMap;
    if (_.has(data, codeSchema)) {
        modelSchema = _.get(data, codeSchema);
        responseModelMap = _.get(data, mapSchema);
    } else if (_.has(data, defaultSchema)) {
        modelSchema = _.get(data, defaultSchema);
        responseModelMap = _.get(data, defaultMapSchema);
    } else {
        return _createValidationError('No response schema defined for %s %s with status code %s');
    }
    var result = swaggerUtil.validateJSONType(modelSchema, body);
    var polymorphicValidationErrors = [];
    if (polymorphicValidation !== 'off') {
        polymorphicValidationErrors = swaggerUtil.validateIndividualObjects(swaggerDoc, responseModelMap, body);
    }
    if (!result.valid || polymorphicValidationErrors.length > 0) {
        return _createValidationError('Error validating response body for %s %s with status code %s', result.errors.concat(polymorphicValidationErrors));
    }
    return;

    function _createValidationError(message, subErrors) {
        var error = new VError(message, res.req.method, res.req.path, res.statusCode);
        error.name = 'ValidationError';
        error.subErrors = subErrors;

        var explainer = {
            message: error.message,
            status: 522,
            type: error.name
        };
        if (error.subErrors) {
            explainer.validation_errors = [];
            error.subErrors.forEach(function (subError) {
                explainer.validation_errors.push({
                    message: subError.message
                });
            });
        }
        return explainer;
    }
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

/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var _ = require('lodash'),
    swaggerUtil = require('../lib/swaggerUtil'),
    VError = require('verror'),
    multer = require('multer'),
    path = require('path'),
    util = require('util');

// config Enum for when multer.storage property matches,
// we set to multe.storage config to multer.memoryStorage()
var MULTER_MEMORY_STORAGE = 'multerMemoryStorage';

var _upload; //will get set to a configured multer instance if multipart form data is used
var httpMethods;
var responseModelValidationLevel;
var polymorphicValidation;
var rejectRequestAfterFirstValidationError;

exports.init = function (app, auth, config, logger, serviceLoader, swagger, callback) {
    var cfg = config.get('swagger');

    responseModelValidationLevel = swagger.getResponseModelValidationLevel();
    polymorphicValidation = swagger.isPolymorphicValidationEnabled();
    httpMethods = swagger.getValidHttpMethods();
    rejectRequestAfterFirstValidationError = !!cfg.rejectRequestAfterFirstValidationError;

    var useBasePath = cfg.useBasePath || (cfg.useBasePath === undefined); //default to true
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

        if (containsUrlEncodedFormData(api)) {
            var middlewareConfig = config.get('express').middleware;
            var foundBodyParserInMiddlewareConfig = (_.indexOf(middlewareConfig, 'body-parser') >= 0 ||
                _.indexOf(middlewareConfig, 'bodyParser') >= 0);
            if (!foundBodyParserInMiddlewareConfig) {
                logger.warn('Body parser not found in middleware config.  ' +
                    'Required when using MIME type application/www-form-urlencoded.');
            }
            var bodyParserConfig = _.extend({}, config.get('bodyParser'), config.get('body-parser'));
            if (_.indexOf(_.keys(bodyParserConfig), 'urlencoded') < 0) {
                logger.warn('Body parser not configured to look for url encoded data.  ' +
                    'Required when using MIME type application/www-form-urlencoded.');
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

            if (data['x-handler'] || data['x-bos-handler']) {
                handlerName = data['x-handler'] || data['x-bos-handler'];
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
                        return logger.warn('Could not find handler function "%s" for module "%s"',
                            methodData.operationId, handlerName);
                    }


                    //Look for custom middleware functions defined on the handler path
                    var additionalMiddleware = [];
                    var middlewareList = methodData['x-middleware'] || methodData['x-bos-middleware'];
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
                                return logger.warn('Could not find middleware function "%s" on module "%s".',
                                    parts[1], parts[0]);
                            }
                        });
                    }

                    logger.debug('Wiring up route %s %s to %s.%s', key, routePath, handlerName, methodData.operationId);
                    registerRoute(app, auth, additionalMiddleware, key, routePath, methodData,
                        methodData.produces || api.produces || null, handlerFunc, api, logger);

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
 * The current use of this function is to figure out whether body parser needs to be configured
 * This is the case when there is an operation that consumes form data without a file
 * If there is a file, then multer will be used to parse form data
 * @param api
 * @returns {boolean}
 */
function containsUrlEncodedFormData(api) {
    if (_.indexOf(api.consumes, 'application/x-www-form-urlencoded') > -1) {
        return true;
    }

    var foundFormData = false;
    _.keys(api.paths).forEach(function(path) {
        var pathData = api.paths[path];
        _.keys(pathData).forEach(function(method) {
            if (_.indexOf(pathData[method].consumes, 'application/x-www-form-urlencoded') > -1) {
                foundFormData = true;
            } else {
                var params = pathData[method].parameters;
                var foundFormDataInParams = false;
                var foundFileFormDataInParams = false;
                _.keys(params).forEach(function (param) {
                    if (params[param].in === 'formData') {
                        foundFormDataInParams = true;
                        if (params[param].type === 'file') {
                            foundFileFormDataInParams = true;
                        }
                    }
                });
                //if there is file form data, body parser may not need to be used
                // because multer will put form data in the request body
                if (foundFormDataInParams && !foundFileFormDataInParams) {
                    foundFormData = true;
                }
            }
        });
        if (foundFormData) {
            return foundFormData;
        }

    });

    return foundFormData;
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
function registerRoute(app, auth, additionalMiddleware, method, path, data, allowedTypes, handlerFunc, swaggerDoc,
    logger) {

    var authMiddleware = auth.getAuthMiddleware() || [];
    additionalMiddleware = authMiddleware.concat(additionalMiddleware);

    if (_.indexOf(data.consumes, 'multipart/form-data') > -1) {
        var fieldData = _.filter(data.parameters, function (param) {
            return param.in === 'formData' && param.type === 'file';
        });
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
            let type;
            //Validate that the content-type is correct per the swagger definition
            wrapCall(res, 'set', function (name, value) {
                if (name === 'Content-Type') {
                    type = value.split(';')[0]; //parse off the optional encoding
                    if (allowedTypes && !_.contains(allowedTypes, type)) {
                        logger.warn('Invalid content type specified: %s. Expecting one of %s', type, allowedTypes);
                    }
                }
            });

            if (responseModelValidationLevel) {
                var responseSender = res.send;
                res.send = function (body) {
                    var isBodyValid = isValidDataType(body);
                    if (!isBodyValid) {
                        if ( type === 'application/json') {
                          try { //body can come in as JSON, we want it unJSONified
                              body = JSON.parse(body);
                          } catch (err) {
                              logger.info('Unexpected format when attempting to validate response');
                              res.send = responseSender;
                              responseSender.call(res, body);
                              return;
                          }
                        }
                    } else if (body) {
                        // if the response object has a property which is an object that implements toJSON() ...
                        // it will cause validation to fail (it'll be an object while a string will be expected)
                        // this dumb-looking code, ensures that we're validating what will be sent over the wire
                        body = JSON.parse(JSON.stringify(body));
                    }
                    var validationErrors = validateResponseModels(res, body, data, swaggerDoc, logger);
                    // check the model for any validation errors, and handle them based on the validation level
                    if (validationErrors) {
                        // 'error'
                        // errors added in the `_response_validation_errors` property of the response,
                        // or of that property of the first and last array entries
                        // we'll create a response object (or array entry) if there isn't one (will break client code)
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
                                        alteredBody[alteredBody.length - 1]._response_validation_errors =
                                            invalidBodyDetails;
                                    }
                                }
                            } else {
                                alteredBody = alteredBody || {};
                                alteredBody._response_validation_errors = invalidBodyDetails;
                            }
                        }

                        // 'warn'
                        // response is sent to the caller unmodified, errors (this model) are only logged (see below)
                        validationErrors.invalidResponse = {
                            method: req.method,
                            path: req.path,
                            statusCode: res.statusCode,
                            body: body || null
                        };

                        // 'fail'
                        // changes the http response code to 522 and separates the validation errors and response body.
                        // Will break client code; should only be used when developing/testing an API in stand alone
                        if (responseModelValidationLevel === 'fail') {
                            body = validationErrors;
                            res.statusCode = validationErrors.status;
                        } else if (alteredBody) {
                            body = alteredBody;
                        }

                        // in all cases, log the validation errors
                        logger[responseModelValidationLevel === 'warn' ? 'warn' : 'error'](
                            'Response validation error:', JSON.stringify(validationErrors, null, 2)
                        );
                    }

                    // after this initial call (sometimes `send` will call itself again),
                    // we don't need to get the response for validation anymore
                    res.send = responseSender;
                    // if we parsed JSON at the start, reJSONify
                    responseSender.call(res, isBodyValid ? body: JSON.stringify(body));

                };
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
            if (parm.default !== undefined && typeof(req.query[parm.name]) === 'undefined') {
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
            if (parm.default !== undefined && typeof(req.query[parm.name]) === 'undefined') {
                req.headers[parm.name] = swaggerUtil.cast(parm, parm.default);
            }
        }
    }
}


function validateRequestParameters(req, data, swaggerDoc, logger, callback) {
    var validationError, validationErrors = [];
    var parameters = _.toArray(data.parameters);
    for (var i = 0; i < parameters.length; i++) {
        validationError = _validateParameter(parameters[i]);
        if (validationError) {
            if (rejectRequestAfterFirstValidationError) {
                return callback(validationError);
            } else {
                validationErrors.push(validationError);
            }
        }
    }

    if (validationErrors.length > 1) {
        var superValidationError = _createRequestValidationError('Multiple validation errors for this request',
            { in: 'request' }, []);
        // if there was more than one validation error, join them all together
        return callback(validationErrors.reduce(function (superError, thisError) {
            if (thisError.subErrors) {
                thisError.subErrors.forEach(function (subError) {
                    superError.subErrors.push(subError);
                });
            } else {
                // when there were no sub errors, we'll create a representative sub error
                // this is an unexpected situation
                superError.subErrors.push({
                    code: 10500, // tv4 user errors are supposed to be > 10000
                    message: thisError.message,
                    source: thisError.source,
                    debug: '(ValidationError with no subErrors)'
                });
            }
            return superError;
        }, superValidationError));
    } else if (validationErrors.length === 1) {
        return callback(validationErrors[0]);
    }
    return callback();

    /**
     * @param  {Object} parameter the swagger-defined parameter to validate
     *
     * @returns {Object} the validation error for the parameter, or null if there's no problem
     */
    function _validateParameter(parameter) {
        var result, error;
        switch (parameter.in) {
        case 'query':
            if (parameter.required && typeof(req.query[parameter.name]) === 'undefined') {
                logger.warn('Missing query parameter "%s" for operation "%s"', parameter.name, data.operationId);
                error = _createRequestValidationError(
                    util.format('Missing %s query parameter', parameter.name), parameter, [{
                        code: 11404,
                        message: 'Missing required query parameter: ' + parameter.name
                    }]);
            } else if (typeof req.query[parameter.name] !== 'undefined') {
                result = swaggerUtil.validateParameterType(parameter, req.query[parameter.name]);
                if (!result.valid) {
                    error = _createRequestValidationError(util.format('Error validating query parameter %s',
                            parameter.name), parameter, result.errors);
                }
            }
            break;

        case 'header':
            if (parameter.required && typeof(req.get(parameter.name)) === 'undefined') {
                logger.warn('Missing header "%s" for operation "%s"', parameter.name, data.operationId);
                error = _createRequestValidationError(
                    util.format('Missing %s header', parameter.name), parameter, [{
                        code: 12404,
                        message: 'Missing required header: ' + parameter.name
                    }]);
            } else if (typeof req.get(parameter.name) !== 'undefined') {
                result = swaggerUtil.validateParameterType(parameter, req.get(parameter.name));
                if (!result.valid) {
                    error = _createRequestValidationError(util.format('Error validating %s header', parameter.name),
                            parameter, result.errors);
                }
            }
            break;

        case 'path':
            result = swaggerUtil.validateParameterType(parameter, req.params[parameter.name]);
            if (!result.valid) {
                error = _createRequestValidationError(util.format('Error validating %s path parameter', parameter.name),
                        parameter, result.errors);
            }
            break;

        case 'formData':
            // fyi: the swagger parser will fail if the user didn't set 'consumes' to
            // multipart/form-data or application/x-www-form-urlencoded
            if (parameter.required && parameter.type === 'file') {
                if (!req.files[parameter.name]) {
                    logger.warn('Missing form parameter "%s" for operation "%s"', parameter.name, data.operationId);
                    error = _createRequestValidationError(
                        util.format('Missing %s form parameter', parameter.name), parameter, [{
                            code: 13404,
                            message: 'Missing required form parameter: ' + parameter.name
                        }]);
                }
            }
            else if (!req.body[parameter.name]) { //multer puts the non-file parameters in the request body
                if (parameter.required) { //something other than file
                    logger.warn('Missing form parameter "%s" for operation "%s"', parameter.name, data.operationId);
                    error = _createRequestValidationError(
                        util.format('Missing %s form parameter', parameter.name), parameter, [{
                            code: 13404,
                            message: 'Missing required form parameter: ' + parameter.name
                        }]);
                }
            } else {
                //go through the param-parsing code which is able to take text and validate
                //it as any type, such as number, or array
                result = swaggerUtil.validateParameterType(parameter, req.body[parameter.name]);
                if (!result.valid) {
                    error = _createRequestValidationError(
                            util.format('Error validating form parameter %s', parameter.name),
                        parameter, result.errors);
                }
            }
            break;

        case 'body':
            result = swaggerUtil.validateJSONType(parameter.schema, req.body);
            var polymorphicValidationErrors = [];
            if (polymorphicValidation !== 'off') {
                polymorphicValidationErrors = swaggerUtil.validateIndividualObjects(swaggerDoc,
                    parameter['x-bos-generated-disc-map'], req.body);
                if (polymorphicValidationErrors.length > 0 && polymorphicValidation === 'warn') {
                    var warning = {
                        errors: polymorphicValidationErrors,
                        body: req.body || null
                    };
                    logger.warn('Request body polymorphic validation error for %s %s:', req.method, req.path,
                        JSON.stringify(warning, null, 2));
                    polymorphicValidationErrors = [];
                }
            }
            if (!result.valid || polymorphicValidationErrors.length > 0) {
                result.errors = result.errors || [];
                error = _createRequestValidationError('Error validating request body', parameter,
                    result.errors.concat(polymorphicValidationErrors));
            }
            break;
        }

        return error;
    }
}
/**
 * @param  {string} message the message to use for this error;
 *                          N.B.: the text of this message is quasi-API, changing it could break API users
 * @param  {Object} parameterConfig the configuration for the parameter that failed validation
 * @param  {string} parameterConfig.in where parameter that failed validation is located, one of:
 *                                     header, path, query, form, body, request (for the request as a whole)
 * @param  {string} [parameterConfig.name] the name of the parameter that failed validation
 *                                         (only used when parameterConfig.in is header, path, query, or form)
 * @param  {Object[]} subErrors the array of validation errors from the swaggerUtil validation function
 *
 * @returns  {Object} a VError representing the validation errors detected for the request
 */
function _createRequestValidationError(message, parameterConfig, subErrors) {
    var error = new VError({
        name: 'ValidationError',
        constructorOpt: _createRequestValidationError
    }, message);
    error.source = { type: parameterConfig.in };
    if (/^(header|path|query|formData)$/.test(parameterConfig.in)) {
        error.source.name = parameterConfig.name;
    }
    error.subErrors = subErrors;
    _.forEach(error.subErrors, function (subError) {
        subError.source = subError.source || error.source;
        subError.field = _.get(subError, 'source.name',
            path.join((subError.dataPath || '/'), _.get(subError, 'params.key', '')));
        subError.in = _.get(subError, 'source.type');

    });
    return error;
}

function validateResponseModels(res, body, data, swaggerDoc, logger) {
    if (!(res.statusCode >= 200 && res.statusCode < 300 || res.statusCode >= 400 && res.statusCode < 500)) {
        //the statusCode for the response isn't in the range that we'd expect to be documented in the swagger
        //i.e.: 200-299 (success) or 400-499 (request error)
        return;
    }

    var schemaPath = 'responses.%s',
        mapPath = 'responses.%s.x-bos-generated-disc-map',
        responseModel = util.format(schemaPath, res.statusCode),
        defaultResponseModel = util.format(schemaPath, 'default'),
        mapSchema = util.format(mapPath, res.statusCode),
        defaultMapSchema = util.format(mapPath, 'default');
    var modelSchema;
    var responseModelMap;
    if (_.has(data, responseModel)) {
        modelSchema = _.get(data, responseModel + '.schema');
        if (!modelSchema) {
            if (_.isEmpty(body)) { //no model, no response body, so nothing to validate
                return;
            } else {
                return _createResponseValidationError('No response schema defined for %s %s with status code %s', res);
            }
        }
        responseModelMap = _.get(data, mapSchema);
    } else if (_.has(data, defaultResponseModel)) {
        modelSchema = _.get(data, defaultResponseModel + '.schema');
        if (!modelSchema) {
            if (_.isEmpty(body)) {
                return;
            } else {
                return _createResponseValidationError('No response schema defined for %s %s with status code %s', res);
            }
        }
        responseModelMap = _.get(data, defaultMapSchema);
    } else {
        return _createResponseValidationError('No response schema defined for %s %s with status code %s', res);
    }
    var result = swaggerUtil.validateJSONType(modelSchema, body);
    var polymorphicValidationErrors = [];
    if (polymorphicValidation !== 'off') {
        polymorphicValidationErrors = swaggerUtil.validateIndividualObjects(swaggerDoc, responseModelMap, body);
    }
    if (!result.valid || polymorphicValidationErrors.length > 0) {
        return _createResponseValidationError('Error validating response body for %s %s with status code %s', res,
            result.errors.concat(polymorphicValidationErrors));
    }
    return;

}
/**
 * @param  {string} messageFormat a format string describing the message that accepts the following parameters:
 *                                  res.req.method, res.req.path, res.statusCode
 * @param  {Object} res the express.js response object
 * @param  {Object[]} subErrors the array of validation errors from the swaggerUtil validation function
 *
 * @returns  {Object} a VError representing the validation errors detected for the response
 */
function _createResponseValidationError(messageFormat, res, subErrors) {
    var error = new VError(messageFormat, res.req.method, res.req.path, res.statusCode);
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
                message: subError.message,
                field: (subError.params.key) ? subError.dataPath + '/' + subError.params.key : subError.dataPath,
                schemaPath: subError.schemaPath,
                model: subError.model
            });
        });
    }
    return explainer;
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

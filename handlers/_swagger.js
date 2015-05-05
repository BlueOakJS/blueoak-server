/* Copyright © 2015 PointSource, LLC. All rights reserved. */
var _ = require('lodash'),
    parser = require('swagger-parser'),
    path = require('path'),
    async = require('async'),
    fs = require('fs'),
    swaggerUtil = require('../lib/swaggerUtil');


var httpMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];

exports.init = function (app, config, logger, serviceLoader, callback) {
    var cfg = config.get('swagger');

    //default to true
    var useBasePath = cfg.useBasePath || cfg.useBasePath === undefined;

    var swaggerDir = path.resolve(global.__appDir, 'swagger');
    var files = [];

    try {
        fs.readdirSync(swaggerDir).forEach(function(fileName) {
           if (path.extname(fileName) === '.json') {
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

            if (err) {
                return swagCallback(err);
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

                //loop for http method keys, like get an post
                _.keys(data).forEach(function(key) {
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

                        logger.debug('Wiring up route %s %s to %s.%s', key, routePath, handlerName, methodData.operationId);
                        registerRoute(app, key, routePath, methodData, methodData.produces || api.produces || [], handlerFunc, logger);

                    }
                });

            });
            swagCallback();
        });
    },  function(err){
        return callback(err);
    });


};

function registerRoute(app, method, path, data, allowedTypes, handlerFunc, logger) {

    app[method].call(app, path, function(req, res, next) {


        if (!validateParameters(req, res, data, logger)) {
            return;
        }

        setDefaultQueryParams(req, data, logger);
        setDefaultHeaders(req, data, logger);

        //Wrap the set function, which is responsible for setting headers
        //Validate that the content-type is correct per the swagger definition
        wrapCall(res, 'set', function(name, value) {
            if (name === 'Content-Type') {
                var type = value.split(';')[0]; //parse off the optional encoding
                if (!_.contains(allowedTypes, type)) {
                    logger.warn('Invalid content type specified: ' + type + '. Expecting one of ' + allowedTypes);
                }
            }
        });

        handlerFunc(req, res, next);

    });
}

//Any parameter with a default that's not already defined will be set to the default value
function setDefaultQueryParams(req, data, logger) {
    var parameters = data.parameters;
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
    var parameters = data.parameters;
    for (var i = 0; i < parameters.length; i++) {
        var parm = parameters[i];
        if (parm.in === 'header') {
            if (parm.default && typeof(req.query[parm.name]) === 'undefined') {
                req.headers[parm.name] = swaggerUtil.cast(parm, parm.default);
            }
        }
    }
}


function validateParameters(req, res, data, logger) {

    var parameters = data.parameters;
    for (var i = 0; i < parameters.length; i++) {
        var parm = parameters[i];

        if (parm.in === 'query') {

            if (parm.required && typeof(req.query[parm.name]) === 'undefined') {
                logger.warn('Missing query parameter "%s" for operation "%s"', parm.name, data.operationId);
                res.status(403).send('Missing query parameter "' + parm.name + '".');
                return false;

            } else if (typeof req.query[parm.name] !== 'undefined') {
                var result = swaggerUtil.validateParameterType(parm, req.query[parm.name]);

                if (result.status !== 'success') {
                    res.status(403).send('Invalid query parameter "' + parm.name + '": ' + result.cause.message);
                    return false;
                }
            }

        } else if (parm.in === 'header') {

            if (parm.required && typeof(req.get(parm.name)) === 'undefined') {
                logger.warn('Missing header "%s" for operation "%s"', parm.name, data.operationId);
                res.status(403).send('Missing header "' + parm.name + '".');
                return false;

            } else if (typeof req.get(parm.name) !== 'undefined') {
                var result = swaggerUtil.validateParameterType(parm, req.get(parm.name));

                if (result.status !== 'success') {
                    res.status(403).send('Invalid header "' + parm.name + '": ' + result.cause.message);
                    return false;
                }
            }

        } else if (parm.in === 'path') {

            var result = swaggerUtil.validateParameterType(parm, req.params[parm.name]);
            if (result.status !== 'success') {
                res.status(403).send('Invalid path parameter "' + parm.name + '": ' + result.cause.message);
                return false;
            }

        } else if (parm.in === 'formData') {
            //TODO: validate form data
        } else if (parm.in === 'body') {
            console.log('validating body', req.body, parm.schema);
            var result = swaggerUtil.validateJSONType(parm.schema, req.body);
            console.log(result);

            if (result.status !== 'success') {
                res.status(403).send('Invalid field "' + parm.name + '": ' + result.cause.message);
                return false;
            }
        }
    }
    return true;
}

function wrapCall(obj, funcName, toCall) {
    var origFunc = obj[funcName];
    obj[funcName] = function() {
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
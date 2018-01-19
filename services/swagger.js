/*
 * Copyright (c) 2015-2018 PointSource, LLC.
 * MIT Licensed
 */

var path = require('path');
var fs = require('fs');
var debug = require('debug')('swagger');
var async = require('async');
var parser = require('swagger-parser');
var swaggerUtil = require('../lib/swaggerUtil');
var refCompiler = require('../lib/swaggerRefCompiler');
var tv4 = require('tv4');
var _ = require('lodash');
var util = require('util');

var specs = {
    dereferenced: {},
    bundled: {},
    names: []
};

var httpMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];

var responseModelValidationLevel;
var polymorphicValidation;
var refCompilation;

exports.discriminatorKeyMap = 'x-bos-generated-disc-map';

exports.init = function (logger, config, callback) {
    var cfg = config.get('swagger');
    // default responseModelValidationLevel to level zero, i.e. off
    responseModelValidationLevel = /warn|error|fail/.test(cfg.validateResponseModels) ?
        cfg.validateResponseModels : 0;
    if (responseModelValidationLevel) {
        logger.info('Response model validation is on and set to level "%s"', responseModelValidationLevel);
    }

    // default polymorphicValidation to 'on'; allow both 'off' and false to turn it off
    polymorphicValidation = /on|warn|off/.test(cfg.polymorphicValidation) ?
        cfg.polymorphicValidation : ((cfg.polymorphicValidation === false) ? 'off' : 'on');
    if (polymorphicValidation !== 'on') {
        logger.info('Polymorphic validation is disabled (%s)', polymorphicValidation);
    }

    refCompilation = typeof cfg.refCompiler === 'object';
    if (refCompilation) {
        logger.info('Ref compilation is enabled (%s), compiling references...', refCompilation);
        refCompiler.compileSpecs(logger, cfg);
    }

    var swaggerDir = null;
    if (isBlueoakProject()) {
        swaggerDir = path.resolve(global.__appDir, '../common/swagger');
    } else {
        swaggerDir = path.resolve(global.__appDir, 'swagger');
    }


    debug('Loading swagger files from %s', swaggerDir);

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
        var handlerName = path.basename(file); //use the swagger filename as our handler module id
        handlerName = handlerName.substring(0, handlerName.lastIndexOf('.')); //strip extensions

        var derefPromise = parser.validate(file);
        parser.bundle(file)
            .then(function (bundledApi) {
                specs.bundled[handlerName] = bundledApi;
                return derefPromise;
            })
            .then(function (dereferencedApi) {
                specs.dereferenced[handlerName] = dereferencedApi;
                if (polymorphicValidation !== 'off') {
                    compileDiscriminatorsForPaths(dereferencedApi.paths, responseModelValidationLevel);
                }
                compileDiscriminatorsForDefinitions(dereferencedApi.definitions);
                flattenModelDefinitions(dereferencedApi.definitions);
                return swagCallback();
            })
            .then (function () {
                specs.names.push(handlerName);
                return swagCallback();
            })
            .catch(function (error) {
                // don't generate an error if it was a non-Swagger Spec JSON file
                var swagErr = error;
                if (path.extname(file) !== '.yaml') {
                    try {
                        var json = JSON.parse(fs.readFileSync(file, {
                            encoding: 'utf8'
                        }));
                        if (!isSwaggerFile(json)) {
                            logger.info('Skipping non-Swagger JSON file %s', file);
                            swagErr = null;
                        }
                    } catch (err) {
                        logger.error('%s is not valid JSON', file);
                    }
                }
                return swagCallback(swagErr);
            });
    }, function (err) {
        callback(err);
    });

};

exports.getResponseModelValidationLevel = function () {
    return responseModelValidationLevel;
};

exports.isPolymorphicValidationEnabled = function () {
    return polymorphicValidation;
};

exports.getValidHttpMethods = function () {
    return httpMethods;
};

exports.getSpecNames = function () {
    return specs.names;
};

exports.getSimpleSpecs = function () {
    return specs.dereferenced;
};

exports.getPrettySpecs = function () {
    return specs.bundled;
};

exports.addFormat = function (format, validationFunction) {
    tv4.addFormat(format, validationFunction);
};

/**
 * Validate an arbitrary object against a model definition in a given specification
 * 
 * @param {String} specName - the name of the specification in which the model is defined
 * @param {String} modelName - the name of the model definition to validate against
 * @param {Object} object - the object to be validated
 * @param {Boolean} [skipPolymorphicChecks] - whether to disable polymorphic checks
 * 
 * @returns {Object} an object containing the validation result:
 *          .valid is a boolean indicated whether the object validated against the model;
 *          .errors is an array of tv4 validation errors for particular fields;
 *          .polymorphicValidationErrors is an array of tv4 validation errors that only
 *              show with polymorphic validation;
 * 
 * @throws {Error} when the model cannot be found
 */
exports.validateObject = function (specName, modelName, object, skipPolymorphicChecks) {
    var spec = _.get(specs.dereferenced, specName);
    if (!spec) {
        throw _createObjectValidationError(
            util.format('Cannot validate object for unknown specification "%s"', specName));
    }
    
    var schema = _.get(spec, ['definitions', modelName].join('.'));
    if (!schema) {
        throw _createObjectValidationError(
            util.format('Cannot validate object for unknown model "%s" in specification "%s"', modelName, specName));
    }
    
    var result = swaggerUtil.validateJSONType(schema, object);
    if (!(skipPolymorphicChecks || _.isEmpty(schema[exports.discriminatorKeyMap]))) {
        result.polymorphicValidationErrors = swaggerUtil.validateIndividualObjects(
            spec, schema[exports.discriminatorKeyMap], object);
        if (result.polymorphicValidationErrors.length > 0) {
            result.valid = false;
        }
    }

    return result;
    
    function _createObjectValidationError(message) {
        var error = new Error(message);
        error.name = 'SwaggerObjectValidationError';
        error.specName = specName;
        error.modelName = modelName;
        return error;
    }
};

function flattenModelDefinitions(definitions) {
    if (!definitions) {
        return;
    }

    Object.keys(definitions).forEach(function (defn) {
        if (definitions[defn].hasOwnProperty('allOf')) {
            var flattenedDefn = {};
            for (var i = 0; i < definitions[defn].allOf.length; i++) {
                //have to clone so that inherited definitions are not affected
                definitions[defn].allOf[i] = _.cloneDeep(definitions[defn].allOf[i]);
                mergeToFlatModel(flattenedDefn, definitions[defn].allOf[i]);
            }
            flattenedDefn.required = flattenedDefn.required ? Object.keys(flattenedDefn.required) : undefined;
            definitions[defn] = flattenedDefn;
        }
    });
}

function mergeToFlatModel(flatModel, model) {
    //have to convert 'required' array to object for merging purposes
    if (model.required && Array.isArray(model.required)) {
        model.required = model.required.reduce(function (reqsAsObj, reqdPropName, arrayIndex) {
            reqsAsObj[reqdPropName] = arrayIndex;
            return reqsAsObj;
        }, {});
    }
    _.merge(flatModel, model);
    if (model.hasOwnProperty('allOf')) {
        model.allOf.forEach(function (subModel) {
            mergeToFlatModel(flatModel, subModel);
        });
    }
    flatModel.allOf = undefined;
}

function compileDiscriminatorsForPaths(paths, doResponseValidation) {
    var pathKeys = Object.keys(paths);
    pathKeys.forEach(function (path) {
        var methodKeys = Object.keys(paths[path]);
        methodKeys.forEach(function (method) {
            if (httpMethods.indexOf(method) !== -1) {//is this key actually an http method
                if (doResponseValidation) {
                    var responseCodeKeys = Object.keys(paths[path][method].responses);
                    responseCodeKeys.forEach(function (responseCode) {
                        var schema = paths[path][method].responses[responseCode].schema;
                        if (schema) {
                            paths[path][method].responses[responseCode][exports.discriminatorKeyMap] =
                                swaggerUtil.getObjectsWithDiscriminator(schema);
                        }
                    });
                }
                if (paths[path][method].parameters) {
                    var requestParamKeys = Object.keys(paths[path][method].parameters);
                    requestParamKeys.forEach(function (param) {
                        var schema = paths[path][method].parameters[param].schema;
                        if (schema) {
                            paths[path][method].parameters[param][exports.discriminatorKeyMap] =
                                swaggerUtil.getObjectsWithDiscriminator(schema);
                        }
                    });
                }
            }
        });
    });
}

function compileDiscriminatorsForDefinitions(definitions) {
    var modelNames = Object.keys(definitions);
    modelNames.forEach(function (modelName) {
        var schema = definitions[modelName];
        var discMap = swaggerUtil.getObjectsWithDiscriminator(schema);
        if (schema.allOf) {
            var completeDiscMap = {
                type: 'object'
            };
            completeDiscMap[exports.discriminatorKeyMap] = discMap;
            schema.allOf.push(completeDiscMap);
        } else {
            schema[exports.discriminatorKeyMap] = discMap;
        }
    });
}

//Try to determine if this is supposed to be a swagger file
//For now look for the required "swagger" field, which contains the version
function isSwaggerFile(json) {
    return json.swagger;
}

//There are two possible places for loading swagger.
//If we're part of a broader blueoak client-server project, blueoak is running
//from a 'server' directory, and there's a sibling directory named 'common' which contains the swagger directory.
//Otherwise we just look in the normal swagger folder within the project
function isBlueoakProject() {
    if ((path.basename(global.__appDir) !== 'server')) {
        return false;
    }
    try {
        return fs.statSync(path.resolve(global.__appDir, '../common/swagger')).isDirectory();
    } catch (err) {
        return false;
    }
}
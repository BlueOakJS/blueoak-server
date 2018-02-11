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
                    preparePathsForPolymorphicValidation(dereferencedApi.paths, responseModelValidationLevel);
                }
                prepareDefinitionsForPolymorphicValidation(dereferencedApi.definitions);
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
 * @param {Object|String} config - configuration for this validation,
 *          or, simply, the name of the spec to use with the default config
 * @param {String|Object} config.spec - the name of the specification in which the model is defined
 *          or the specification model definition object to use for validation
 * @param {Boolean} [config.banUnknownProperties=false] - whether to fail validation when there are undefined properties
 * @param {Boolean} [config.failFast=false] - whether to stop validation when the first error is found
 * @param {Boolean} [config.skipPolymorphicChecks=false] - whether to disable polymorphic checks
 * @param {String|Object} model - the name of the model, in the given spec, to validate against
 *          or the actual model to use
 * @param {Object} object - the object to be validated
 * 
 * @returns {Object} an object containing the validation result:
 *          .valid is a boolean indicated whether the object validated against the model;
 *          .errors is an array of tv4 validation errors for particular fields;
 *          .polymorphicValidationErrors is an array of tv4 validation errors that only
 *              show with polymorphic validation;
 * 
 * @throws {Error} when the spec or model cannot be found
 */
exports.validateObject = function (config, model, object) {
    var specObject, specName;
    if (typeof config === 'string') {
        specName = config;
    } else if (typeof config.spec === 'string') {
        specName = config.spec;
    } else if (typeof config.spec === 'object') {
        specObject = config.spec;
        specName = '<inline>';
    }
    if (!specObject) {
        specObject = _.get(specs.dereferenced, specName);
        
        if (!specObject) {
            throw _createObjectValidationError(
                util.format('Cannot validate object for unknown specification "%s"', specName));
        }
    }
    
    var modelObject, modelName;
    if (typeof model === 'object') {
        modelObject = model;
        modelName = '<inline>';
    } else {
        modelName = model;
        modelObject = _.get(specObject, ['definitions', modelName].join('.'));
    }
    if (!modelObject) {
        throw _createObjectValidationError(
            util.format('Cannot validate object for unknown model "%s" in specification "%s"', modelName, specName));
    }
    
    var result = swaggerUtil.validateJSONType(modelObject, object, config);
    if (!(config.skipPolymorphicChecks || _.isEmpty(modelObject[exports.discriminatorKeyMap]))
        && (result.valid || !config.failFast)) {
        result.polymorphicValidationErrors = swaggerUtil.validateIndividualObjects(
            specObject, modelObject[exports.discriminatorKeyMap], object, config);
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

function preparePathsForPolymorphicValidation(paths, doResponseValidation) {
    var pathKeys = _.keys(paths);
    pathKeys.forEach(function (path) {
        var methodKeys = _.keys(paths[path]);
        methodKeys.forEach(function (method) {
            if (httpMethods.indexOf(method) !== -1) {//is this key actually an http method
                if (doResponseValidation) {
                    var responseCodeKeys = _.keys(paths[path][method].responses);
                    responseCodeKeys.forEach(function (responseCode) {
                        var responseDefinition = paths[path][method].responses[responseCode];
                        _makeSchemaPolymorphic(responseDefinition);
                    });
                }
                if (paths[path][method].parameters) {
                    var requestParamKeys = _.keys(paths[path][method].parameters);
                    requestParamKeys.forEach(function (param) {
                        var requestParameter = paths[path][method].parameters[param];
                        _makeSchemaPolymorphic(requestParameter);
                    });
                }
            }
        });
    });

    function _makeSchemaPolymorphic(parentObject) {
        if (!parentObject.schema) {
            return;
        }
        _addDiscMapToSchema(parentObject.schema);
        parentObject.schema = _createFlattenedSchema(parentObject.schema);
    }
}

function _addDiscMapToSchema(targetSchema, schemaName) {
    var discMap = swaggerUtil.getObjectsWithDiscriminator(targetSchema, schemaName);
    if (targetSchema.allOf) {
        var completeDiscMap = {
            type: 'object'
        };
        completeDiscMap[exports.discriminatorKeyMap] = discMap;
        targetSchema.allOf.push(completeDiscMap);
    } else {
        targetSchema[exports.discriminatorKeyMap] = discMap;
    }
}

function _createFlattenedSchema(sourceSchema) {
    var flattenedSchema;
    if (sourceSchema.type === 'array') {
        flattenedSchema = _.clone(sourceSchema);
        flattenedSchema.items = _createFlattenedSchema(sourceSchema.items);
    } else if (Array.isArray(sourceSchema.allOf)) {
        flattenedSchema = _doFlatMerge({}, sourceSchema);
    } else if (sourceSchema.type === 'object') {
        flattenedSchema = _.cloneDeep(sourceSchema);
    } else {
        flattenedSchema = _.clone(sourceSchema);
    }
    return flattenedSchema;

    function _doFlatMerge(target, source) {
        if (Array.isArray(source.allOf)) {
            source.allOf.forEach(function (duckType) {
                _doFlatMerge(target, duckType);
            });
            return target;
        }
        
        // we have to handle merging the array `required` on our own
        var reqArr = _.union(target.required, source.required);
        _.merge(target, source);
        target.required = reqArr;
        return target;
    }
}

function prepareDefinitionsForPolymorphicValidation(definitions) {
    var modelNames = _.keys(definitions);
    modelNames.forEach(function (modelName) {
        var schema = definitions[modelName];
        _addDiscMapToSchema(schema, modelName);
        definitions[modelName] = _createFlattenedSchema(schema);
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
/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var tv4 = require('tv4'),
    formats = require('tv4-formats'),
    _ = require('lodash');

tv4.addFormat(formats);


exports.validateParameterType = function (schema, value) {

    //Since data will be coming in from a query parameter, it comes in as a string
    //rather than a JSON object.  So we do our best to cast it to the desired type.
    value = castValueFromString(schema, value);

    var result = tv4.validateMultiple(value, schema);
    return result;
};

exports.validateJSONType = function (schema, value) {
    var result = tv4.validateMultiple(value, schema);
    return result;
};

exports.getObjectsWithDiscriminator = function (object, returnedObjs, pathFromObjectRoot) {
    var properties = object;
    var discriminator = "";
    if (_.has(object, "discriminator") || _.has(object, "items.discriminator")) {
        if (object.type === "array") {
            properties = object.items.properties;
            discriminator = object.items.discriminator;
        }
        else {
            discriminator = object.discriminator;
        }
        returnedObjs[pathFromObjectRoot.substring(0, pathFromObjectRoot.length-1)] = discriminator; //strip extra period

    }
    _.forOwn(properties, function (value, key) {
        if (key.type === "object" || key.type === "array") {
            exports.getObjectsWithDiscriminator(key, returnedObjs, pathFromObjectRoot + key + ".");
        }
    });
    return returnedObjs;
};

exports.validateIndividualObjects = function (specs, pathToModelMap, obj) {
    var validationErrors = [];
    var individualResult;
    _.forOwn(pathToModelMap, function (disc, path) {//key is path within object, value is the discriminator property
        if (Array.isArray(_.get(obj,path,obj))){
            _.get(obj,path,obj).forEach(function (item) {
                if (!_.get(item,path,item)[disc]){//discriminator not defined for this object
                    validationErrors.push({message: "discriminator not defined for inheriting model" + JSON.stringify(item,path,item)});
                }
                else if (!specs.definitions[_.get(item,path,item)[disc]]){
                    logger.warn('missing model definition for %s', disc);
                    validationErrors.push({message: "missing model definition for" + disc});
                    //throw some error to indicate that ALL model definitions must be defined in root swagger document
                    //this will happen automatically during bundling/dereferencing IF all models are referenced at least once in the specs
                }
                else {
                    individualResult = exports.validateJSONType(specs.definitions[_.get(item, path, item)[disc]], _.get(JSON.stringify(item, path, item)));
                    if (!individualResult.valid) {
                        validationErrors.push(individualResult);
                    }
                }
            });
        }
        else {
            if (!specs.definitions[_.get(obj,path,obj)[disc]]){
                logger.warn('missing model definition for %s', disc);
                //throw some error to indicate that ALL model definitions must be defined in root swagger document
                //this will happen automatically during bundling/dereferencing IF all models are referenced at least once in the specs
            }
            if (!_.get(item,path,item)[disc]){//discriminator not defined for this object
                validationErrors.push({message: "discriminator not defined for inheriting model" + JSON.stringify(item,path,item)})
            }
            individualResult = exports.validateJSONType(specs.definitions[_.get(obj,path,obj)[disc]], _.get(JSON.stringify(obj,path,obj)));
            if (!individualResult.valid){
                validationErrors.push(individualResult);
            }
        }
    });
    return validationErrors;
};

function castValueFromString(schema, value) {
    if (schema.type === 'number' || schema.type === 'integer') {
        var orig = value;
        value = Number(value); //cast
        //if value can't be cast to a number, return the original string
        //which will let tv4 create an appropriate error
        if (isNaN(value)) {
            return orig;
        }
    }

    if (schema.type === 'boolean') {
        if (value === 'true') {
            value = true;
        } else if (value === 'false') {
            value = false;
        }
    }

    if (schema.type === 'array') {
        var format = schema.collectionFormat || 'csv';

        //value could already be an array, for example if it was defined 
        //as a default value in the swagger schema
        if (!_.isArray(value)) {
            value = parseArray(value, format);
        }
        for (var i = 0; i < value.length; i++) {
            value[i] = castValueFromString(schema.items, value[i]);
        }
    }

    return value;
}

exports.cast = castValueFromString;


function parseArray(str, format) {

    //str should be an array since multiple query params of the same name were used, e.g. foo=bar1&foo=bar2
    if (format === 'multi') {
        return _.isArray(str) ? str : [str];
    }

    var splitChar = {
        'csv': ',',
        'ssv': ' ',
        'tsv': '\t',
        'pipes': '|'
    }[format];

    return str.split(splitChar);
}
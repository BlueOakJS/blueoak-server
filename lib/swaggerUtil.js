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

exports.getObjectsWithDiscriminator = function (object) {
    var map = {};
    var properties = object.properties;
    var discriminator = "";
    if (_.has(object, "allOf") || _.has(object, "items.allOf")) {
        var inheritedModels = object.allOf ? object.allOf : object.items.allOf;
        map.isArray = object.type === "array" ? true : undefined;
        inheritedModels.forEach(function (inheritedModel) {
            _.merge(map, exports.getObjectsWithDiscriminator(inheritedModel));
        });
    }
    if (_.has(object, "discriminator") || _.has(object, "items.discriminator")) {
        if (object.type === "array") {
            properties = object.items.properties;
            discriminator = object.items.discriminator;
            map.isArray = true;
        }
        else {
            discriminator = object.discriminator;
        }
        map.discriminator = discriminator;
    }
    var mapProp;
    _.forOwn(properties, function (value, key) {
        if (value.type === "object" || value.type === "array" || value.allOf) { //is this a complex type
            mapProp = exports.getObjectsWithDiscriminator(value);
            if (Object.keys(mapProp).length != 0){ //avoid adding property to map if it is an empty object
                map[key] = mapProp;
            }
        }
    });
    return map;
};

exports.validateIndividualObjects = function (specs, map, data) {
    var validationErrors = [];
    if (map.discriminator){
        if (map.isArray){
            data.forEach(function (item) {
                validationErrors = validationErrors.concat(validateObject(specs, item, map.discriminator));
            });
        }
        else {
            validationErrors = validationErrors.concat(validateObject(specs, data, map.discriminator));
        }
    }
    var errors;
    if (Array.isArray(data)) {
        for (var i=0;i<data.length;i++){
            errors = loopThroughMapProps(specs, map, data[i]);
            if (errors === "no nested objects"){
                break;
            }
            validationErrors = validationErrors.concat(errors);
        }
    }
    else {
        errors = loopThroughMapProps(specs, map, data);
        if (errors !== "no nested objects"){
            validationErrors = validationErrors.concat(errors);
        }
    }

    return validationErrors;

};

function loopThroughMapProps(specs, map, data) {
    var validationErrors = [];
    var isNestedObject = false;
    _.forOwn(map, function (value, key) {
        if (typeof value === "object" && data[key]) { //check for any nested objects
            isNestedObject = true;
            validationErrors = validationErrors.concat(exports.validateIndividualObjects(specs, map[key], data[key]));
        }
    });
    if (isNestedObject){
        return validationErrors;
    }
    else {
        return "no nested objects";
    }
}

function validateObject(specs, obj, disc) {
    var validationErrors = [];
    if (!obj[disc]){//discriminator not defined for this object
        validationErrors.push({message: "discriminator " + disc + " not defined for inheriting model " + JSON.stringify(obj)})
    }
    else if (!specs.definitions[obj[disc]]){
        validationErrors.push({message: "model definition not found for " + disc});
        //throw some error to indicate that ALL model definitions must be defined in root swagger document
        //this will happen automatically during bundling/dereferencing IF all models are referenced at least once in the specs
    }
    else {
        validationErrors = validationErrors.concat(exports.validateJSONType(specs.definitions[obj[disc]], obj).errors);
    }
    return validationErrors;
}

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
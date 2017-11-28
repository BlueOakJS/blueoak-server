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
    var inheritedModels;
    if (object.type === 'array') {
        properties = object.items.properties;
        if (_.has(object, 'items.allOf')) {
            inheritedModels = object.items.allOf;
            inheritedModels.forEach(function (inheritedModel) {
                _.merge(map, exports.getObjectsWithDiscriminator(inheritedModel));
            });
        }
        if (_.has(object, 'items.discriminator')) {
            map.discriminator = object.items.discriminator;
        }
    }
    else {
        if (_.has(object, 'allOf')) {
            inheritedModels = object.allOf;
            inheritedModels.forEach(function (inheritedModel) {
                _.merge(map, exports.getObjectsWithDiscriminator(inheritedModel));
            });
        }
        if (_.has(object, 'discriminator')) {
            map.discriminator = object.discriminator;
        }
    }
    _.forOwn(properties, function (value, key) {
        if (value.type === 'object' || value.type === 'array' || value.allOf) { //is this a complex type
            map[key] = exports.getObjectsWithDiscriminator(value);
        }
    });
    if (!JSON.stringify(map).includes('discriminator')) {
        // if map does not include a 'discriminator' property by now, reset to empty object
        map = {};
    }
    return map;
};

exports.validateIndividualObjects = function (specs, map, data) {
    var validationErrors = [];
    if (Array.isArray(data)) {
        if (map.discriminator) {
            data.forEach(function (item) {
                validationErrors = validationErrors.concat(validateObject(specs, item, map.discriminator));
            });
        }
        data.forEach(function (item) {
            validationErrors = validationErrors.concat(validateNestedObjects(specs, map, item));
        });
    }
    else {
        if (map.discriminator) {
            validationErrors = validationErrors.concat(validateObject(specs, data, map.discriminator));
        }
        validationErrors = validationErrors.concat(validateNestedObjects(specs, map, data));
    }
    return validationErrors;
};

function validateNestedObjects(specs, map, data) {
    var validationErrors = [];
    _.forOwn(map, function (value, key) {
        if (typeof value === 'object' && data[key]) { //check for any nested objects
            validationErrors = validationErrors.concat(exports.validateIndividualObjects(specs, map[key], data[key]));
        }
    });
    return validationErrors;
}

function validateObject(specs, obj, disc) {
    var validationErrors = [];
    if (!obj[disc]) {//discriminator not defined for this object
        validationErrors.push(
            {
                message: 'discriminator ' + disc + ' not defined for inheriting model'
            }
        );
    }
    else if (!specs.definitions[obj[disc]]) {
        validationErrors.push({
            message: 'model definition not found for ' + disc +
                ': ALL model definitions must be defined in root swagger document. ' +
                'The built-in $ref compiler can be used to manage your definitions for you.' +
                'Learn more at https://github.com/BlueOakJS/blueoak-server/wiki/Handlers#swagger-ref-compiler'
        });
        //indicate that ALL model definitions must be defined in root swagger document
        //happens automatically during bundling/dereferencing IF all models are referenced at least once in the specs
    }
    else {
        var newErrors = exports.validateJSONType(specs.definitions[obj[disc]], obj).errors;
        newErrors.forEach(function (newError) {
            newError.model = obj[disc];
        });
        validationErrors = validationErrors.concat(newErrors);
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

/* Copyright © 2015 PointSource, LLC. All rights reserved. */
var tv4 = require('tv4'),
    formats = require('tv4-formats'),
    _ = require('lodash');
    
tv4.addFormat(formats);


exports.validateParameterType = function(schema, value) {

    //Since data will be coming in from a query parameter, it comes in as a string
    //rather than a JSON object.  So we do our best to cast it to the desired type.
    value = castValueFromString(schema, value);

    var result = tv4.validateMultiple(value, schema);
    return result;
};

exports.validateJSONType = function(schema, value) {
    var result = tv4.validateMultiple(value, schema);
    return result;
};

function castValueFromString(schema, value) {
    if (schema.type === 'number' || schema.type === 'integer') {
        value = Number(value); //cast
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
        value = parseArray(value, format);
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
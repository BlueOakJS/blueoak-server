var tv4 = require('tv4');
var _ = require('lodash');


exports.validateParameterType = function(parameter, value) {

    //Since data will be coming in from a query parameter, it comes in as a string
    //rather than a JSON object.  So we do our best to cast it to the desired type.
    value = castValueFromString(parameter, value);

    if (tv4.validate(value, parameter)) {
        return success();
    } else {
        return failure(tv4.error);
    }
}

function castValueFromString(parameter, value) {
    if (parameter.type === 'number' || parameter.type === 'integer') {
        value = Number(value); //cast
    }

    if (parameter.type === 'boolean') {
        if (value === 'true') {
            value = true;
        } else if (value === 'false') {
            value = false;
        }
    }

    if (parameter.type === 'array') {
        var format = parameter.collectionFormat || 'csv';
        value = parseArray(value, format);
        for (var i = 0; i < value.length; i++) {
            value[i] = castValueFromString(parameter.items, value[i]);
        }
    }

    return value;
}


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

function success() {
    return {
        status: 'success'
    };
}

function failure(message) {
    return {
        status: 'failed',
        cause: message
    };
}
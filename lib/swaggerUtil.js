
//"string", "number", "integer", "boolean", "array" or "file". If type is "file", the consumes MUST be either "multipart/form-data" or " application/x-www-form-urlencoded" and the parameter MUST be in "formData".
exports.validateParameterType = function(parameter, value) {
    if (parameter.type === 'string') {
        return validateString(parameter, value);
    }

    //TODO: Do something different for number vs integer?
    if (parameter.type === 'number' || parameter.type === 'integer') {
        return validateNumber(parameter, value);
    }

    if (parameter.type === 'boolean') {
        return validateBoolean(parameter, value);
    }

    return success();
}


//allow maxLength, minLength, pattern
function validateString(parameter, value) {
    //TODO: enum
    if (typeof parameter.maxLength !== 'undefined' && value.length > parameter.maxLength) {
        return failure(value.length + ' > max length of ' + parameter.maxLength );
    }

    if (typeof parameter.minLength !== 'undefined' && value.length < parameter.minLength) {
        return failure(value.length + ' < min length of ' + parameter.minLength);
    }

    if (typeof parameter.pattern !== 'undefined') {
        var regexp = new RegExp(parameter.pattern);
        if (!regexp.test(value)) {
            return failure(value + ' does not match ' + parameter.pattern);
        }
    }

    return success();
}

function validateNumber(parameter, value) {

    if (isNaN(value)) {
        return failure(value + 'is not a number');
    }

    //multipleOf, maximum and exclusiveMaximum, minimum and exclusiveMinimum
    if (typeof parameter.multipleOf !== 'undefined' && value % parameter.multipleOf !== 0) {
        return failure(value + ' is not a multiple of ' + parameter.multipleOf);
    }

    if (typeof parameter.maximum !== 'undefined') {
        var max = parameter.maximum;
        var exMax = parameter.exclusiveMaximum || false;

        if (exMax && value >= max) {
            return failure(value + ' >= ' + max);
        }

        if (!exMax && value > max) {
            return failure(value + ' >= ' + max);
        }

    }

    if (typeof parameter.minimum !== 'undefined') {
        var min = parameter.minimum;
        var exMin = parameter.exclusiveMinimum|| false;

        if (exMin && value <= min) {
            return failure(value + ' <= ' + min);
        }

        if (!exMin && value < min) {
            return failure(value + ' < ' + min);
        }

    }

    return success();
}

function validateBoolean(parameter, value) {
    if (String(value) != 'true' && String(value) != 'false') {
        return failure(value + ' is not a boolean.');
    }
    return success();
}

function success() {
    return {
        status: 'success'
    };
}

function failure(message) {
    return {
        status: 'failed',
        message: message
    };
}
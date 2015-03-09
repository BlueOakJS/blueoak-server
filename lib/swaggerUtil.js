
//"string", "number", "integer", "boolean", "array" or "file". If type is "file", the consumes MUST be either "multipart/form-data" or " application/x-www-form-urlencoded" and the parameter MUST be in "formData".
exports.validateParameterType = function(parameter, value) {
    if (parameter.type === 'string') {
        return validateString(parameter, value);
    }

    return success();
}


//allow maxLength, minLength, pattern
function validateString(parameter, value) {
    if (parameter.maxLength && value.length > parameter.maxLength) {
        return failure(value.length + ' > max length of ' + parameter.maxLength );
    }

    if (parameter.minLength && value.length < parameter.minLength) {
        return failure(value.length + ' < min length of ' + parameter.minLength);
    }

    if (parameter.pattern) {
        var regexp = new RegExp(parameter.pattern);
        if (!regexp.test(value)) {
            return failure(value + ' does not match ' + parameter.pattern);
        }
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
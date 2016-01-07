/* Copyright © 2015 PointSource, LLC. All rights reserved. */
var crypto = require('crypto'),
    prompt = require('prompt'), // jshint ignore:line
    _ = require('lodash');

var ENCRYPTED_TEXT_PATTERN = /^{([\w-]+)}(.*)=$/;
/**
 * Decrypts a text string from the config
 * @param text a string of the format {<cipher>}text=
 * @param key the key to decrypt the text
 * @returns a string
 */
module.exports.decrypt = function (text, key) {

    var match = ENCRYPTED_TEXT_PATTERN.exec(text);

    //match is null if it doesn't match the pattern
    if (match === null) {
        throw new Error('Invalid string: must be in the form {<cipher>}text=');
    }

    var encoding = match[1];
    var data = match[2];
    var decipher = crypto.createDecipher(encoding, key);
    var dec = decipher.update(data, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
};

/**
 * Prompt for a password
 * @param callback callback(err, password)
 */
module.exports.promptForPassword = function (callback) {

    var properties = [
        {
            description: 'Enter your password',
            name: 'password',
            hidden: true,
            type: 'string',
            pattern: /^\w+$/
        }
    ];
    prompt.start();

    prompt.get(properties, function (err, result) {
        if (err) {
            return callback(err);
        }
        callback(null, result.password);
    });
};


function isEncrypted(str) {
    return ENCRYPTED_TEXT_PATTERN.test(str);
}

/**
 * Recurse through the provided json object, looking for strings that are encrypted
 * @param obj
 * @returns {*}
 */
function containsEncryptedData(obj) {
    var foundEncrypted = false;
    if (_.isString(obj)) {
        foundEncrypted = isEncrypted(obj);
    } else if (_.isArray(obj)) {
        for (var i = 0; i < obj.length; i++) {
            foundEncrypted = foundEncrypted || containsEncryptedData(obj[i]);
        }
    } else if (_.isObject(obj)) {
        for (var key in obj) {
            foundEncrypted = foundEncrypted || containsEncryptedData(obj[key]);
        }
    }

    return foundEncrypted;
}

/**
 * Recurse through an object looking for encrypted strings.  If found, replace the string with the decrypted text.
 * @param obj
 * @param decryptFunction
 */
function decryptObject(obj, decryptFunction) {
    if (_.isArray(obj)) {
        for (var i = 0; i < obj.length; i++) {
            if (_.isString(obj[i])) {
                if (isEncrypted(obj[i])) {
                    obj[i] = decryptFunction(obj[i]);
                }
            } else {
                decryptObject(obj[i], decryptFunction);
            }
        }
    } else if (_.isObject(obj)) {
        for (var key in obj) {
            if (_.isString(obj[key])) {
                if (isEncrypted(obj[key])) {
                    obj[key] = decryptFunction(obj[key]);
                }
            } else {
                decryptObject(obj[key], decryptFunction);
            }
        }
    }
}

module.exports.containsEncryptedData = containsEncryptedData;
module.exports.decryptObject = decryptObject;
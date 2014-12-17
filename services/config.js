exports.metadata = {
    id: "config",
    description: "Configuration service",
    bootstrap: true,
    dependencies: ['security']
}

var config = require('config'),
    stripJsonComments = require('strip-json-comments'),
    fs = require('fs'),
    _ = require('lodash'),
    cluster = require('cluster'),
    prompt = require('prompt');

//These are the default config values for anything not specified in the app's config dir
defaults = {}

exports.init = function(server, callback) {

    fs.readFile(__dirname + '/../defaults.json', function (err, data) {
        if (err) {
            return callback(err);
        }
        defaults = JSON.parse(stripJsonComments(data.toString()));

        if (cluster.isMaster) {
            //Check if any of the config has encrypted data, in which case we need to prompt for a password
            if (scanConfigForEncryptedValues(config)) {
                promptForPassword(function(err, result) {
                    if (err) {
                        return callback(err);
                    } else {
                        exports.decryptionKey = result;
                        callback();
                    }
                });
            } else {
                callback();
            }
        } else {
            if (process.env.decryptionKey) {
                try {
                    decryptConfig(config, function (str) {
                        //Decryption function
                        return server.security.decrypt(str, process.env.decryptionKey);
                    });
                } catch (err) {
                    return callback(new Error('Could not decrypt keys: ' + err.message));
                }
            }
            callback();
        }
    });

};

exports.get = function(key) {
    var val = defaults[key] || {};
    return config.util.extendDeep(val, config[key]);
};

function isEncrypted(str) {
    return /^{.*}.*=$/.test(str);
}

/**
 * Recurse through the provided json object, looking for strings that are encrypted
 * @param obj
 * @param callback
 * @returns {*}
 */
function scanConfigForEncryptedValues(obj) {
    var foundEncrypted = false;
    if (_.isString(obj)) {
        foundEncrypted = isEncrypted(obj);
    } else if (_.isArray(obj)) {
        for (var i = 0; i < obj.length; i++) {
            foundEncrypted = foundEncrypted || scanConfigForEncryptedValues(obj[i]);
        }
    } else if (_.isObject(obj)) {
        for (var key in obj) {
            foundEncrypted = foundEncrypted || scanConfigForEncryptedValues(obj[key]);
        }
    }

    return foundEncrypted;
};

function decryptConfig(obj, decryptFunction) {
    if (_.isArray(obj)) {
        for (var i = 0; i < obj.length; i++) {
            if (_.isString(obj[i])) {
                if (isEncrypted(obj[i])) {
                    obj[i] = decryptFunction(obj[i]);
                }
            } else {
                decryptConfig(obj[i], decryptFunction);
            }
        }
    } else if (_.isObject(obj)) {
        for (var key in obj) {
            if (_.isString(obj[key])) {
                if (isEncrypted(obj[key])) {
                    obj[key] = decryptFunction(obj[key]);
                }
            } else {
                decryptConfig(obj[key], decryptFunction);
            }
        }
    }
};


function promptForPassword(callback) {
    //Check first if we have a config value for the key
    var key = exports.get('security').key;
    if (key) {
        return callback(null, key);
    } else if (process.env.decryptionKey) { //already set in env variable
        return callback(null, process.env.decryptionKey);
    }

    //otherwise we'll have to prompt

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
        if (err) { return callback(err); }
        callback(null, result.password);
    });
}
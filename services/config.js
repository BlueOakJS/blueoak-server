exports.metadata = {
    description: "Configuration service",
    bootstrap: true,
    dependencies: []
};

var config = require('config'),
    stripJsonComments = require('strip-json-comments'),
    fs = require('fs'),
    cluster = require('cluster'),
    security = require('../lib/security');

//These are the default config values for anything not specified in the app's config dir
var defaults = {};

exports.init = function(server, cfg, callback) {

    fs.readFile(__dirname + '/../defaults.json', function (err, data) {
        if (err) {
            return callback(err);
        }
        defaults = JSON.parse(stripJsonComments(data.toString()));

        //We only ever want to check for a password in the cluster scenario, and then let the master
        //pass the password to the individual workers
        if (cluster.isMaster) {
            //Check if any of the config has encrypted data, in which case we need to prompt for a password
            if (security.containsEncryptedData(config)) {
                getPassword(function(err, result) {
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
            //If we're a worker process, we expect that the master has set the decryptionKey as an env variable
            if (process.env.decryptionKey) {
                try {
                    security.decryptObject(config, function (str) {
                        //Decryption function
                        return security.decrypt(str, process.env.decryptionKey);
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


function getPassword(callback) {
    //Check first if we have a config value for the key
    var key = exports.get('security').key;
    if (key) {
        return callback(null, key);
    } else if (process.env.decryptionKey) { //already set in env variable
        return callback(null, process.env.decryptionKey);
    }

    security.promptForPassword(callback);
}


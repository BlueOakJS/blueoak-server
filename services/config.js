/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var _ = require('lodash'),
    stripJsonComments = require('strip-json-comments'),
    fs = require('fs'),
    cluster = require('cluster'),
    security = require('../lib/security'),
    path = require('path'),
    importFresh = require('import-fresh');

var config = null;

//These are the default config values for anything not specified in the app's config dir
var defaults = {};

var individualKeyCache = {}; //when we load a specific key file, e.g. routes.json, store the content here

exports.init = function(callback) {
    process.env.NODE_CONFIG_DIR = path.resolve(global.__appDir, 'config');
    config = importFresh('config');

    fs.readFile(path.join(__dirname, '/../defaults.json'), function (err, data) {
        if (err) {
            return callback(err);
        }
        defaults = JSON.parse(stripJsonComments(data.toString()));

        //We only ever want to check for a password in the cluster scenario, and then let the master
        //pass the password to the individual workers
        //
        //if process.env.decryptionKey is set, we're in single worker mode.
        //So even though we are a master, act more like a worker.
        if (cluster.isMaster && !exports.decryptionKey) {
            //Check if any of the config has encrypted data, in which case we need to prompt for a password
            if (security.containsEncryptedData(config)) {
                getPassword(function(err, result) {
                    if (err) {
                        return callback(err);
                    } else {
                        exports.decryptionKey = result;
                        security.decryptObject(config, function (str) {
                            //Decryption function
                            return security.decrypt(str, result);
                        });
                        return callback();
                    }
                });
            } else {
                return callback();
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
            return callback();
        }
    });

};

exports.get = function(key) {
    //Load default config, merge in user config, and then the individual config files
    var val = defaults[key] || {};
    val = config.util.extendDeep(val, config[key]);
    return config.util.extendDeep(val, loadFromIndividualConfigFile(key));
};

//For every requested config key, check if there's a json file by that name in the config dir.
//If there is, load the contents and return it so that it can be merged in.
function loadFromIndividualConfigFile(key) {
    key = _.replace(key, /\/|\\/g, ''); //forward and backslashes are unsafe when resolving filenames

    if (individualKeyCache[key]) {
        return individualKeyCache[key];
    } else {
        var toLoad = path.resolve(global.__appDir, 'config/' + key + '.json');

        var content = '{}';
        try {
            content = fs.readFileSync(toLoad);
        } catch (err) {
            //file must not exists
        }

        var json = {};
        try {
            json = JSON.parse(stripJsonComments(content.toString()));
        } catch (err) {
            console.warn('Error parsing JSON for %s', toLoad);
        }

        security.decryptObject(json, function (str) {
            //Decryption function
            return security.decrypt(str, process.env.decryptionKey);
        });
        individualKeyCache[key] = json;

        return individualKeyCache[key];
    }
}


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


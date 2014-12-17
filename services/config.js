exports.metadata = {
    id: "config",
    description: "Configuration service"
}

var config = require('config'),
    stripJsonComments = require('strip-json-comments'),
    fs = require('fs');

//These are the default config values for anything not specified in the app's config dir
defaults = {}

exports.init = function(registry, callback) {
    fs.readFile(__dirname + '/../defaults.json', function (err, data) {
        if (err) {
            return callback(err);
        }
        defaults = JSON.parse(stripJsonComments(data.toString()));
        callback();
    });
}

exports.get = function(key) {
    var val = defaults[key];
    return config.util.extendDeep(val, config[key]);
}
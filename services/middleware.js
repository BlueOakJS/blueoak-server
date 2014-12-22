/*
 * The express service takes care of creating the express apps, registering handlers, and then starting the server
 * listening on each configured port.
 */
exports.metadata = {
    id: "middleware",
    description: "Manages expressjs middleware",
    dependencies: ['config', 'logger']
};
var path = require('path'),
    fs = require('fs'),
    _ = require('lodash');

var toRegister = [];

exports.init = function(server, cfg, callback) {

    //Get all the js files in either our middleware directory or the project's directory
    findMiddlewareJSFiles(function(err, files) {

        var idToMod = {};

        //For each file, load it and then read the id
        files.forEach(function(file) {
            var mod = require(file);
            idToMod[mod.metadata.id] = mod;
        });

        //Now we go through the config list to order the mods in the configured order
        //cfg is an array that's been cast to an object (keyed off of '0', '1', ...
        for (var i = 0; i < _.keys(cfg).length; i++) {
            var mwId = cfg[i];
            if (idToMod[mwId]) {
                toRegister.push(idToMod[mwId]);
            } else {
                server.get('logger').error('Could not locate middleware \'%s\'.', mwId);
            }
        }
    });
    callback();
};

/**
 * Return all the registered middleware modules
 * @returns {Array}
 */
exports.getMiddleware = function() {
    return toRegister;
};

function findMiddlewareJSFiles(callback) {
    var toReturn = [];

    var dirs = [path.resolve(__dirname, '../middleware'), path.resolve(global.__appDir, 'middleware')];
    dirs.forEach(function(dir) {

        if (fs.existsSync(dir)) {
            var files = fs.readdirSync(dir);
            files.forEach(function (file) {
                if (path.extname(file) === '.js') {
                    toReturn.push(path.resolve(dir, file));
                }
            });
        }
    });
    callback(null, toReturn);

}
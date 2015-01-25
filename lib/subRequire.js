/* This provides some extended 'require' functionality needed for the loader
 * Imagine we have a handler with a dependency on a service X.
 * To load X, we do a require, which resolves to the location in node_modules/X
 *
 * Now X has a dependency on another service, Y. Y is located at node_modules/X/node_modules/Y.
 * If we do a require on Y, it will fail because require doesn't traverse down into submodules.
 *
 * subRequire provides a require(id, parentId) method, which is able to traverse down.
 * In this case we could call subRequire(Y, X), and it would require Y from the context of X.
 */
var path = require('path'),
    _ = require('lodash');

var modulePath = {}; //maintain a list of the paths where we resolved files - needed for unloading the modules

/*
 * Similar to require(...).
 *
 * Can be used with JS files, e.g. require('/some/file.js')
 * Normal modules, e.g. require('someModule'),
 * but also provides a way to load submodules by passing the optional parentId argument.
 */
module.exports = function (id, parentId) {

    if (id.indexOf('.js') > -1) {
        return loadJsFile(id);
    } else {
        return loadModule(id, parentId);
    }
};

//Attempts to delete a file from the require cache
module.exports.unload = function (id) {
    var path = modulePath[id];
    if (path && require.cache[path]) {
        delete require.cache[path];
        modulePath[id] = null
        delete modulePath[id];
    } else {
        return false;
    }
};


//Performs a require directly on a file
//A module id is calculated based on the name of the file, e.g.
// /some/dir/file.js has an id of 'file'.
//That ID is added as a __id field of the module
function loadJsFile(file) {
    var modId = path.basename(file).slice(0, -3);
    var mod = require(file);
    modulePath[modId] = file;
    mod.__id = modId;
    return mod;
}

function loadModule(id, parentId) {
    var mod = null;
    try {
        mod = require(id);
        modulePath[id] = require.resolve(id);
    } catch (err) {
        //if there's an error, either the module isn't available, or it might be a dependency of a sub module

        var parentPath = modulePath[parentId];
        var parentMod = require.cache[parentPath];

        mod = parentMod.require(id); //do a require from the context of the parent module

        //I don't like this, but it's the only way I've found to get the path of a child module
        //Normally we would do a require.resolve(id), but there's no way to do that within the context of a submodule
        //Instead, we search through the modules children and find the entry for the one we're interested in.
        //The id for that entry is the path to the module.
        var path = _.findWhere(parentMod.children, {exports: mod}).id;
        modulePath[id] = path;
    }
    return mod;
}
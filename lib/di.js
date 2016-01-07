/* Copyright © 2015 PointSource, LLC. All rights reserved. */
//Dependency injection utils

var fs = require('fs'),
    path = require('path');

//Checks if last parameter is named callback
exports.hasCallback = function(fn) {
    var funStr = fn.toString();
    var params = funStr.slice(funStr.indexOf('(') + 1, funStr.indexOf(')')).match(/([^\s,]+)/g);
    return params !== null && params.indexOf('callback') > -1;
};

/*
 * Return an array of the argument names for a function
 * If the function has no arguments, [] is returned.
 */
exports.getParamNames =  function(fn) {
    var funStr = fn.toString();
    var toReturn = funStr.slice(funStr.indexOf('(') + 1, funStr.indexOf(')')).match(/([^\s,]+)/g);

    //strip the callback
    if (toReturn === null) {
        return [];
    }
    if (toReturn.length > 0 && toReturn[toReturn.length - 1] === 'callback') {
        toReturn = toReturn.slice(0, toReturn.length - 1);
    }
    return toReturn;
};

var MAX_LOAD_DEPTH = 1; //don't recurse below one subdir when looking for services/consumers

/*
 * Use this to locate modules in the given directory.
 * For each js file found, callback is called with two parameters callback(dir, file)
 * where dir is the current directory and file is the file name.
 * depth is used to keep track of how deep we've recursed.
 * We won't recurse beyond MAX_LOAD_DEPTH
 */
function iterateOverJsFiles(dir, callback, depth) {

    depth = depth || 0;
    if (depth > MAX_LOAD_DEPTH) {
        return;
    }
    //logger.debug('Looking for files in %s at depth %s', dir, depth);

    if (fs.existsSync(dir)) {
        var files = fs.readdirSync(dir);
        files.forEach(function (file) {
            if (path.extname(file) === '.js') {
                return callback(dir, file);
            } else {
                var subDir = path.resolve(dir, file);
                if (fs.lstatSync(subDir).isDirectory()) {
                    iterateOverJsFiles(subDir, callback, depth + 1);
                }
            }
        });
    } else { // jshint ignore:line
        //logger.warn('%s is not a valid directory', dir);
    }
}

exports.iterateOverJsFiles = iterateOverJsFiles;
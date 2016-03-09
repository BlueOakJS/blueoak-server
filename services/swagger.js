/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */

var path = require('path');
var fs = require('fs');
var debug = require('debug')('swagger');
var async = require('async');
var parser = require('swagger-parser');

var specs = {
    dereferenced: {},
    bundled: {}
};


exports.init = function(logger, callback) {

    var swaggerDir = null;
    if (isBlueoakProject()) {
        swaggerDir = path.resolve(global.__appDir, '../common/swagger');
    } else {
        swaggerDir = path.resolve(global.__appDir, 'swagger');
    }


    debug('Loading swagger files from %s', swaggerDir);

    var files = [];

    try {
        fs.readdirSync(swaggerDir).forEach(function (fileName) {
            //look for json and yaml
            if (path.extname(fileName) === '.json') {
                files.push(path.resolve(swaggerDir, fileName));
            } else if (path.extname(fileName) === '.yaml') {
                files.push(path.resolve(swaggerDir, fileName));
            }
        });
    } catch (err) {
        //swagger dir probably doesn't exist
        return callback();
    }



    //Loop through all our swagger models
    //For each model, parse it, and automatically hook up the routes to the appropriate handler
    async.eachSeries(files, function parseSwagger(file, swagCallback) {

        parser.bundle(file, function (err, api) {

            if (err) {
                var swagErr = err;
                if (path.extname(file) !== '.yaml') {
                    //Was this an actual swagger file?  Could just be a partial swagger pointed to by a $ref
                    try {
                        var json = JSON.parse(fs.readFileSync(file, {
                            encoding: 'utf8'
                        }));
                        if (!isSwaggerFile(json)) {
                            //invalid swagger file ... some other JSON or Swagger partial ... skip it
                            logger.warn('Skipping non-Swagger JSON file %s', file);
                            swagErr = null;
                        }
                    } catch (err) {
                        logger.error('%s is not valid JSON', file);
                    }
                }
                return swagCallback(swagErr);
            }

            //no error
            var handlerName = path.basename(file); //use the swagger filename as our handler module id
            handlerName = handlerName.substring(0, handlerName.lastIndexOf('.')); //strip extensions

            specs.bundled[handlerName] = api;
            parser.validate(file, function (err, apiAsPlainJson) {
                if (err) {
                    logger.error('Failed dereferencing swagger spec: ' + file);
                    return swagCallback(err);
                }
                specs.dereferenced[handlerName] = apiAsPlainJson;
                return swagCallback();
            });
        });
    }, function(err) {
        callback(err);
    });

};

exports.getSimpleSpecs = function() {
    return specs.dereferenced;
};

exports.getPrettySpecs = function () {
    return specs.bundled;
};

//Try to determine if this is supposed to be a swagger file
//For now look for the required "swagger" field, which contains the version
function isSwaggerFile(json) {
    return json.swagger;
}

//There are two possible places for loading swagger.
//If we're part of a broader blueoak client-server project, blueoak is running
//from a 'server' directory, and there's a sibling directory named 'common' which contains the swagger directory.
//Otherwise we just look in the normal swagger folder within the project
function isBlueoakProject() {
    if ((path.basename(global.__appDir) !== 'server')) {
        return false;
    }
    try {
        return fs.statSync(path.resolve(global.__appDir, '../common/swagger')).isDirectory();
    } catch (err) {
        return false;
    }
}
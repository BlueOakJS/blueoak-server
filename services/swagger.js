/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */

var path = require('path');
var fs = require('fs');
var debug = require('debug')('swagger');
var async = require('async');
var parser = require('swagger-parser');
var deref = require('json-schema-deref');

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

        parser.bundle(file, function (err, api, metadata) {

            if (err && path.extname(file) === '.yaml') {
                return swagCallback(err);
            }

            if (err) {
                //Was this an actual swagger file?  Could just be a partial swagger pointed to by a $ref
                try {
                    var json = JSON.parse(fs.readFileSync(file));

                    //valid JSON
                    if (isSwaggerFile(json)) {
                        //this must be a swagger file, but it doesn't validate. fail
                        return swagCallback(err);
                    }
                } catch (err) {
                    //wasn't even valid JSON, error out
                    return swagCallback(err);
                }

                logger.warn('Skipping %s', file);
                return swagCallback();
            }

            //no error
            var handlerName = path.basename(file); //use the swagger filename as our handler module id
            handlerName = handlerName.substring(0, handlerName.lastIndexOf('.')); //strip extensions

            specs.bundled[handlerName] = api;
            deref(api, function (err, apiAsPlainJson) {
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
    try {
        return path.basename(global.__appDir) === 'server'
            && fs.statSync(path.resolve(global.__appDir, '../common/swagger'));
    } catch (err) {
        //the fs.statSync will return false if dir doesn't exist
        return false;
    }

}
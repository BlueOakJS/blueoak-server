#!/usr/bin/env node

/* Copyright © 2015 PointSource, LLC. All rights reserved. */

var path = require('path'),
    fs = require('fs'),
    async = require('async'),
    parser = require('swagger-parser'),
    esprima = require('esprima'),
    _ = require('lodash'),
    codegen = require('../lib/codegen');


/* Ways expression functions can be defined
 * Export named function
 *
 *  exports.foo = function (req, res, next) {}
 *
 * Module export
 *  module.exports.foo = function(req, res, next) {}
 *
 * Object declarations
 * module.exports = {
 *   blah: function(req, res, next) {}
 * }
 */

var swaggerDir = path.resolve(process.cwd(), 'swagger');
var handlerDir = path.resolve(process.cwd(), 'handlers');

fs.readdir(handlerDir, function (err, files) {
    if (err) {
        return console.warn('Could not read handler directory: ' + handlerDir);
    }

    fs.readdir(swaggerDir, function (err, files) {
        if (err) {
            return console.warn('Could not read swagger directory: ' + swaggerDir);
        }

        async.eachSeries(files, function (file, callback) {
            var swaggerFile = path.resolve(swaggerDir, file);

            parser.parse(swaggerFile, function (err, api, metadata) {

                if (err) {
                    return callback(err);
                } else {

                    processSwaggerFile(api, file, function (err) {
                        callback(err);
                    });

                }
            });

        }, function (err) {
            if (err) {
                return console.warn('Error processing swagger files: ' + err.message);
            }
        });
    });

});

function processSwaggerFile(api, filename, callback) {
    var jsName = path.basename(filename).replace('.json', '.js');
    var jsPath = path.resolve(handlerDir, jsName);
    fs.readFile(jsPath, function (err, content) {
        var jsContent = null;
        if (err) {
            //try creating the file
            fs.createWriteStream(jsPath);
            console.log('Created handler file ' + jsPath);
            jsContent = '';
        } else {
            jsContent = content.toString();
        }
        var ast = esprima.parse(jsContent, {range: true});
        var modType = codegen.detectType(ast);

        var existingFunctions = codegen.getExistingFunctions(modType, ast);
        _.keys(api.paths).forEach(function (path) {
            var pathInfo = api.paths[path];
            _.keys(pathInfo).forEach(function (method) {
                var methodInfo = pathInfo[method];
                if (!methodInfo.operationId) {
                    console.warn(path + ' ' + method + ' is missing an operationId');
                } else {
                    //see if this operationId already exists
                    if (existingFunctions.indexOf(methodInfo.operationId) > -1) {
                        console.log(methodInfo.operationId + ' already exists.');
                    } else {
                        var props = {
                            opId: methodInfo.operationId,
                            route: path,
                            method: method.toUpperCase()
                        };
                        jsContent = codegen.generateOperation(modType, ast, jsPath, props);

                        //reparse because the code has been modified
                        ast = esprima.parse(jsContent, {range: true});
                    }
                }
            });

        });

        callback();
    });
}

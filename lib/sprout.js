/* Copyright © 2015 PointSource, LLC. All rights reserved. */
var fs = require('fs'),
    path = require('path');

var sproutManifest = 'sprout-assets.json';

//checks whether the project has a sprout-assets.json
module.exports.isSproutApp = function() {
    return exists(path.join(global.__appDir, sproutManifest));
}

//assume isSproutApp === true
function getPackages() {
    var manifest = require(path.join(global.__appDir, sproutManifest));
    return manifest.packages;
}

//Look for integrations and connectors in all the dependent packages specified
//in the sprout-assets
module.exports.loadPackages = function(loader) {
    var packages = getPackages();
    packages.forEach(function(packageName) {
        var packagePath = path.resolve(global.__appDir, 'node_modules/' + packageName);
        if (exists(packagePath)) {
            var intPath = path.join(packagePath, 'integrations');
            if (exists(intPath)) {
                loader.loadConsumers(intPath, 'handlers');
            }
            
            var connectorPath = path.join(packagePath, 'connectors');
            if (exists(connectorPath)) {
                loader.loadServices(connectorPath);
            }

        } else {
            services.get('logger').warn('Could not find package %s.', packageName);
        }
        
    });
}

//return true or false whether the given file exists
function exists(path) {
      try {
        fs.openSync(path, 'r');
        return true;
    } catch(err) {
        return false;
    }  
}
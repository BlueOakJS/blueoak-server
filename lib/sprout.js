var fs = require('fs'),
    path = require('path');

var sproutManifest = 'sprout-package.json';

module.exports.isSproutApp = function() {
    try {
        fs.openSync(path.join(global.__appDir, sproutManifest), 'r');
        return true;
    } catch(err) {
        return false;
    }

}
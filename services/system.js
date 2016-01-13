/*
 * Copyright 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var os = require('os');
var _ = require('lodash');


//this mod is only used to get stats about the system
exports.init = function () {
};

function getBlueOakVersion() {
    var pkg = require('../package.json');
    return pkg.version;
}

exports.stats = function (callback) {
    var versions = {
        'blueoak-server': getBlueOakVersion()
    };

    _.extend(versions, process.versions);
    var stats = {
        os: {
            hostname: os.hostname(),
            arch: os.arch(),
            type: os.type(),
            release: os.release()
        },
        versions: versions
    };

    callback(undefined, stats);
};
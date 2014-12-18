exports.metadata = {
    id: "logger",
    description: "Logging service",
    dependencies: ['config']
};

var _ = require('lodash');

exports.init = function(server, cfg, callback) {
    var util = require('util');

    //Merge the default levels with any custom-configured levels
    var levels = _.unique(cfg.default_levels.concat(cfg.levels || [])); //e.g. 'DEBUG', 'INFO', 'WARN', 'ERROR'

    levels.forEach(function(level) {
        module.exports[level.toLowerCase()] = function() {
            //{timestamp: Date.now(), pid: process.pid}
            //console.log('%s %s', level, util.format.apply(util, arguments));
            console.log('%s [%s] (%s) %s', level, Date.now(), process.pid, util.format.apply(util, arguments));
        };
    });

    callback();
};
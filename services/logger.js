exports.metadata = {
    id: "logger",
    description: "Logging service",
    dependencies: ['config']
}


exports.init = function(registry, callback) {

    var util = require('util');
    var config = registry.get('config').get('logging');
    var levels = config.levels; //e.g. 'DEBUG', 'INFO', 'WARN', 'ERROR'
console.log(levels)
    levels.forEach(function(level) {
        module.exports[level.toLowerCase()] = function() {
            //{timestamp: Date.now(), pid: process.pid}
            //console.log('%s %s', level, util.format.apply(util, arguments));
            console.log('%s [%s] (%s) %s', level, Date.now(), process.pid, util.format.apply(util, arguments));
        };
    });

    callback();
}
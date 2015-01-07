exports.metadata = {
    description: "Logging service",
    dependencies: ['config']
};

var _ = require('lodash'),
    chalk = require('chalk');

exports.init = function(server, cfg, callback) {
    var util = require('util');

    //Merge the default levels with any custom-configured levels
    var levels = _.unique(cfg.default_levels.concat(cfg.levels || [])); //e.g. 'DEBUG', 'INFO', 'WARN', 'ERROR'
    var workerCount = server.get('config').get('cluster').maxWorkers; //needed for PID 'auto' option

    levels.forEach(function(level) {
        module.exports[level.toLowerCase()] = function() {
            var toLog = level + ' ';

            //show pid if either "auto" and multiple workers, or true
            if ( (cfg.showPID === 'auto' && (workerCount !== 1)) || cfg.showPID === true) {
                toLog += '(' + process.pid + ') ';
            }

            if (cfg.timestamp === 'iso') {
                toLog += '[' + new Date().toISOString() + '] ';
            } else if (cfg.timestamp === 'ms') {
                toLog += '[' + String(Date.now()) + '] ';
            } //else "none" or false

            var msg = util.format.apply(util, arguments);

            //Add color if enabled
            if (cfg.color) {
                if (level === 'WARN') {
                    msg = chalk.yellow(msg);
                } else if (level === 'ERROR') {
                    msg = chalk.red(msg);
                } else if (level === 'DEBUG') {
                    msg = chalk.cyan(msg);
                } else {
                    msg = chalk.green(msg);
                }
            }
            console.log(toLog + msg);
        };
    });

    callback();
};
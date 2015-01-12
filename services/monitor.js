var SDC = require('statsd-client'),
    _ = require('lodash');

var sdc;
var enabled = false;
var methodsToExpose = ['increment', 'decrement', 'gauge', 'gaugeDelta', 'timing'];

exports.init = function(config, logger) {
    var cfg = config.get('monitor');
    if (!cfg.host) { //have to have a host in order to monitor
        logger.info('Monitoring is disabled.');
    } else {
        sdc = new SDC({host: cfg.host, port: cfg.port, debug: cfg.debug});
        enabled = true;
    }

    //Wrap all the methods in sdc with either a call to sdc or a no-op if monitoring is disabled
    methodsToExpose.forEach(function(name) {
        if (enabled) {
            exports[name] = function() {
                sdc[name].apply(sdc, arguments);
            };
        } else {
            exports[name] = function() {}; //no-op
        }
    });
};

exports.enabled = function() {
    return enabled;
};

exports.getExpressHelper = function(prefix, options) {
    return sdc.helpers.getExpressMiddleware(prefix, options);
};
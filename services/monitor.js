var StatsD = require('node-statsd'),
    _ = require('lodash');

var client;
var enabled = false;
var methodsToExpose = ['increment', 'decrement', 'set', 'unique', 'gauge', 'histogram', 'timing'];

exports.init = function(config, logger) {
    var cfg = config.get('monitor');
    if (!cfg.host) { //have to have a host in order to monitor
        logger.info('Monitoring is disabled.');
    } else {
        client = new StatsD(cfg);
        enabled = true;
    }

    //Wrap all the methods in sdc with either a call to sdc or a no-op if monitoring is disabled
    methodsToExpose.forEach(function(name) {
        if (enabled) {
            exports[name] = function() {
                client[name].apply(client, arguments);
            };
        } else {
            exports[name] = function() {}; //no-op
        }
    });
};

exports.enabled = function() {
    return enabled;
};


//based off of https://github.com/uber/express-statsd
exports.express = function(prefix, genRoute) {
    return function (req, res, next) {
        var startTime = new Date().getTime();

        // Function called on response finish that sends stats to statsd
        function sendStats() {
            var key = '';
            if (genRoute) {
                routeName = req.route.path;
                if (Object.prototype.toString.call(routeName) === '[object RegExp]') {
                    // Might want to do some sanitation here?
                    routeName = routeName.source;
                }

                if (routeName === '/') routeName = 'root.';
                routeName = req.method + routeName;
                routeName = routeName.replace(/:/g, '').replace(/^\/|\/$/g, '').replace(/\//g, ".");
                key = prefix + '.' + routeName + '.';
            } else {
                key = prefix + '.';
            }

            // Status Code
            var statusCode = res.statusCode || 'unknown_status';
            client.increment(key + statusCode);

            // Response Time
            var duration = new Date().getTime() - startTime;
            client.timing(key + 'response_time', duration);

            cleanup();
        }

        // Function to clean up the listeners we've added
        function cleanup() {
            res.removeListener('finish', sendStats);
            res.removeListener('error', cleanup);
            res.removeListener('close', cleanup);
        }

        // Add response listeners
        res.once('finish', sendStats);
        res.once('error', cleanup);
        res.once('close', cleanup);

        if (next) {
            next();
        }
    };
}

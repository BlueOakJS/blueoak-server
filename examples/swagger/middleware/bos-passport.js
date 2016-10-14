var _ = require('lodash'),
    passport = require('passport'),
    subRequire = require('../../../lib/subRequire');
var strategyMap= {};
var cfg;
var loader;

module.exports = {
    init : init,
    authenticate: authenticate
};

function init(app, config, serviceLoader) {
    cfg = config.get('passport');
    loader = serviceLoader;
    app.use(passport.initialize());
    //if sessions are enabled and express session is also being used,
    //express session middleware MUST be listed first in the middleware config
    if (cfg.session) {
        app.use(passport.session());
    }
}

function authenticate(strategyId, strategy) {
    //load passport strategy module
    if (!strategyMap[strategy.module]) {
        strategyMap[strategy.module] = subRequire(strategy.module, 'bos-passport').Strategy;
    }
    _.forEach(_.keys(strategy.options), function (opt) {
        strategy.options[opt] = prepareOption(strategy.options[opt]);
    });
    _.forEach(_.keys(strategy.routeOptions), function (opt) {
        strategy.routeOptions[opt] = prepareOption(strategy.routeOptions[opt]);
    });
    strategy.verify = prepareOption(strategy.verify);
    passport.use(strategyId, new strategyMap[strategy.module](strategy.options, strategy.verify));
    return passport.authenticate(strategyId, strategy.routeOptions);
}

//fetch the option from the config, or if option is a service method, point to or call the method with supplied args
//maybe make the method args able to be fetched from the config?
//else just return the option
function prepareOption(opt) {
    if (typeof opt === 'string') {
        var configRegex = /^{{(.*)}}$/;
        var result = configRegex.exec(opt);
        if (result && result[1]) {
            // This is a config-based option
            return _.get(cfg, result[1]);
        }
    } else if (typeof opt === 'object') {
        if (opt.service) {
            var service = loader.get(opt.service);
            var method = service[opt.method.name];
            if (opt.method.execute) {
                return method.apply(service, opt.method.args);
            } else {
                return _.partial.apply(_, [method].concat(opt.method.args));
            }
        }
    }
    return opt;
}

//need serializeUser and deserializeUser functions for session enabling

var _ = require('lodash'),
    passport = require('passport'),
    subRequire = require('../lib/subRequire');

var strategyMap;
var cfg;
var loader;

module.exports = {
    init : init,
    registerSecurityStrategies: registerSecurityStrategies,
    authenticate: authenticate
};

function init(config, serviceLoader) {
    cfg = config.get('passport');
    loader = serviceLoader;
}

function registerSecurityStrategies() {
    var strategies = cfg.strategies;
    _.forEach(strategies, function (strategy) {
        //load passport strategy module
        if (!strategyMap[strategy.module]) {
            strategyMap[strategy.module] = subRequire(strategy.module, 'bos-passport').Strategy;
        }
        _.forEach(_.keys(strategy.options), function (opt) {
            strategy.options[opt] = prepareOption(strategy.options[opt]);
        });
        //strategy.id MUST be the same as the name of a security requirement in the swagger spec
        passport.use(strategy.id, new strategyMap[strategy.module](strategy.options, strategy.verify));
    });
}

//securityReq -> strategyId should be a one to one mapping
function authenticate(req, res, next, securityReq, securityDefn) {
    _.forEach(_.keys(cfg.options), function (opt) {
        cfg.options[opt] = prepareOption(cfg.options[opt]);
    });
    return passport.authenticate(securityReq, cfg.options);
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
            if (method.execute) {
                return method.apply(service, method.args);
            } else {
                return _.partial.apply(_, [method].concat(method.args));
            }
        }
    }
    return opt;
}


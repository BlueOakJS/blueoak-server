var passport = require('passport');

module.exports = {
    init : init
};

function init(app, config, bosPassport) {
    app.use(passport.initialize());
    //if sessions are enabled and express session is also being used,
    //express session middleware MUST be listed first in the middleware config
    if (config.get('passport').options.session) {
        app.use(passport.session());
    }
    bosPassport.registerSecurityStrategies();
}

//need serializeUser and deserializeUser functions for session enabling

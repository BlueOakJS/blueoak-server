var _ = require('lodash');

exports.init = function(app, logger) {
    app.use(function (req, res, next) {
        if (!req.bosAuthenticationData) {
            return next();
        }
        _.forEach(req.bosAuthenticationData, function (authData) {
            switch (authData.type) {

            case 'basic':
                if (!(authData.username && authData.password)) {
                    res.setHeader('WWW-Authenticate', 'Basic realm="' + authData.securityReq + '"');
                    res.status(401).send();
                    return false;
                }
                break;
            case 'apiKey':
                if (!authData.password) {
                    res.status(401).send();
                    return false;
                }
                break;
            case 'oauth2':
                if (authData.securityDefn.flow === 'implicit') {
                    if (!(authData.password)) {
                        res.sendStatus(401);
                        return false;
                    }
                } else {
                    if (!(authData.tokenData)) {
                        res.sendStatus(401);
                        return false;
                    }
                }
                break;
            }
        });
        if (!res.headersSent) {
            return next();
        }
    });
};

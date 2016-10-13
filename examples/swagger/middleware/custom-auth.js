
exports.init = function(app, logger) {
    app.use(function (req, res, next) {
        if (!req.bosAuthenticationData) {
            return next();
        }
        switch (req.bosAuthenticationData.type) {

        case 'Basic':
            if (!(req.bosAuthenticationData.username && req.bosAuthenticationData.password)) {
                res.sendStatus(401);
            } else {
                return next();
            }
            break;
        case 'apiKey':
            if (!(req.bosAuthenticationData.password)) {
                res.sendStatus(401);
            } else {
                return next();
            }
            break;
        }
    });
};

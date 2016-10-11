
exports.init = function(app, logger) {
    app.use(function (req, res, next) {
        if (!req.bosAuthenticationData) {
            next();
        }
        switch (req.bosAuthenticationData.type) {

        case 'basic':
            if (!(req.bosAuthenticationData.username && req.bosAuthenticationData.password)) {
                res.sendStatus(401);
            } else {
                next();
            }
            break;
        case 'apiKey':
            if (!(req.bosAuthenticationData.password)) {
                res.sendStatus(401);
            } else {
                next();
            }
            break;
        }
    });
};

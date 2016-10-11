
exports.init = function(app, logger) {
    app.use(function (req, res, next) {
        if (!req.bosAuth) {
            next();
        } else if (!req.bosAuth.authenticationData) {
            res.sendStatus(401);
        } else {
            //have some stuff here to perform app specific authentication
            next();
        }
    });
};

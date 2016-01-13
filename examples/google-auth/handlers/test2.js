/*
 * Copyright 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
exports.init = function(app, auth) {

    //manual injection of auth middleware
    app.get('/test2', auth.get('google-oauth'), function(req, res) {
        res.json({email: req.user.email});
    });
};
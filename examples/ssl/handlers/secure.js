/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
module.exports.init = function(app) {
    app.get('/hello', function (req, res) {
        res.status(200).send('Secure connection? ' + req.secure);
    });
};
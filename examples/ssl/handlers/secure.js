/* Copyright © 2015 PointSource, LLC. All rights reserved. */
module.exports.init = function(app) {
    app.get('/hello', function (req, res) {
        res.status(200).send('Secure connection? ' + req.secure);
    });
};
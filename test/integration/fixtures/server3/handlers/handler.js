/* Copyright © 2015 PointSource, LLC. All rights reserved. */

module.exports.init = function(app) {
    app.get('/session', function(req, res, next) {
        res.status(200).json(req.session.data);
    });

    app.post('/session', function(req, res, next) {
        req.session.data = req.body;
        res.status(201).json(req.session.data);
    });

};

/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */

module.exports.init = function(app) {
    app.get('/endpoint1', function(req, res) {
        res.status(200).json({name: 'endpoint1'});
    });

    app.post('/endpoint1', function(req, res) {
        res.status(200).json({name: 'endpoint1'});
    });

    app.put('/endpoint1', function(req, res) {
        res.status(200).json({name: 'endpoint1'});
    });

    app.delete('/endpoint1', function(req, res) {
        res.status(200).json({name: 'endpoint1'});
    });

};
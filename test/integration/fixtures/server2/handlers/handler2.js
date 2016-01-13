/*
 * Copyright 2015-2016 PointSource, LLC.
 * MIT Licensed
 */

module.exports.get = function(req, res) {
    res.status(200).json({name: 'endpoint2'});
};

module.exports.put = function(req, res) {
    res.status(200).json({name: 'endpoint2'});
};

module.exports.post = function(req, res) {
    res.status(200).json({name: 'endpoint2'});
};

module.exports.delete = function(req, res) {
    res.status(200).json({name: 'endpoint2'});
};

module.exports.all = function(req, res) {
    res.status(200).json({name: 'endpoint3'});
};
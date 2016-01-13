/*
 * Copyright 2015-2016 PointSource, LLC.
 * MIT Licensed
 */

module.exports.get = function(req, res) {
    console.log('GET!');
    res.status(200).json({name: 'endpoint4'});
};
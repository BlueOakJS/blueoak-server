/* Copyright © 2015 PointSource, LLC. All rights reserved. */

module.exports.get = function(req, res) {
    console.log('GET!');
    res.status(200).json({name: 'endpoint4'});
};
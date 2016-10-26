/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
exports.pets1 = function(req, res, next) {
    res.json({
        name: 'pets1'
    });
};

exports.pets2 = function(req, res, next) {
    res.json({
        name: 'pets2'
    });
};

exports.pets2Upload = function(req, res, next) {
    res.json({petId: Number(req.body.petId), file: req.files.pet[0]});
};

exports.pets2Post = function(req, res, next) {
    res.json({petId: Number(req.body.petId), name: req.body.petName});
};

exports.pets3 = function(req, res, next) {
    res.json({
        name: 'pets3'
    });
};

exports.pets4 = function(req, res, next) {
    res.json({
        name: 'pets4'
    });
};


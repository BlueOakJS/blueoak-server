/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
exports.pets1 = function (req, res, next) {
    res.send({
        name: 'pets1',
        id: 1
    });
};

exports.pets2 = function (req, res, next) {
    res.send({
        name: 'pets2'
    });
};

exports.pets3 = function (req, res, next) {
    res.json({
        name: 'pets3'
    });
};

exports.pets4 = function (req, res, next) {
    res.json({
        name: 'pets4'
    });
};

exports.pets6 = function (req, res, next) {
    res.json({
        name: 'Mr. Bigglesworth',
        isFurry: req.query.isFurry,
        isVaccinated: req.headers['isVaccinated']
    });
};

exports.pets22 = function (req, res, next) {
    res.status(201).send(req.body);
};

exports.petsPostNoContent = function (req, res) {
    res.sendStatus(204);
};

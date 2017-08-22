/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var service;
exports.init = function (logger, petService) {
    service = petService;
};

exports.getPets = function (req, res, next) {
    res.send(service.getPets());
};

/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var service1;
var service2;
exports.init = function (logger, petService1, petService2) {
    service1 = petService1;
    service2 = petService2;
};

exports.getPets1 = function (req, res, next) {
    res.send(service1.getPets());
};

exports.getPets2 = function (req, res, next) {
    res.send(service2.getPets());
};

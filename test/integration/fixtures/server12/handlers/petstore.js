/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var service1,
    service2,
    serviceModule;

exports.init = function (petService1, petService2, petServiceModule) {
    service1 = petService1;
    service2 = petService2;
    serviceModule = petServiceModule;
};

exports.getPets1 = function (req, res, next) {
    res.send(service1.getPets());
    next();
};

exports.getPets2 = function (req, res, next) {
    res.send(service2.getPets());
    next();
};

exports.getPets3 = function (req, res, next) {
    res.send(serviceModule.getPets());
    next();
};

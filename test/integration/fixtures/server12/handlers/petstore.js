/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var service1;
var service2;
var serviceModule;
exports.init = function (logger, petService1, petService2, petServiceModule) {
    service1 = petService1;
    service2 = petService2;
    serviceModule = petServiceModule;
};

exports.getPets1 = function (req, res, next) {
    res.send(service1.getPets());
};

exports.getPets2 = function (req, res, next) {
    res.send(service2.getPets());
};

exports.getPets3 = function (req, res, next) {
    res.send(serviceModule.getPets());
}

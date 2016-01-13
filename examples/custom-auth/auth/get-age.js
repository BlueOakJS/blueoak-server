/*
 * Copyright 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
exports.init = function (app) {

};

//simulates what could be a call to look up some additional profile data
exports.authenticate = function (req, res, next) {
    if (req.user) {
        req.user.profile = {age: Math.floor((Math.random() * 80) + 1)};
    }
    next();
};
/*
 * Copyright 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var init = false;

exports.init = function(winstonLogger) {
    init = true;
};

exports.isInit = function() {
    return init;
};
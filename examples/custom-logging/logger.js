/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
//Placing a logger.js in my app root let's me setup a logger via code rather than config.
var winston = require('winston');

//From within the init, I'm free to setup whatever transports I want
module.exports.init = function(logger) {

    logger.add(winston.transports.Console, {
        timestamp: function() {
            return Date.now();
        }
    });
};
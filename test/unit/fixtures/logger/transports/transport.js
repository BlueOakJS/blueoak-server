
var util = require('util');
var winston = require('winston');
var initOptions = null;

var Transport = function(options) {
    initOptions = options;
};
util.inherits(Transport, winston.Transport);

Transport.prototype.log = function() {
    
};

exports.foo = {
    bar: Transport
};

exports.getOptions = function() {
    return initOptions;
};
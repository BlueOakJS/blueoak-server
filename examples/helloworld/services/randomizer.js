/* Copyright © 2015 PointSource, LLC. All rights reserved. */
//Uses random.org to generate a random integer
var request = require('request');
var url, _logger;

exports.init = function(logger, config, callback) {
    var cfg = config.get('randomizer');
    var min = cfg.min || 0;
    var max = cfg.max || 100;
    url = 'http://www.random.org/integers/?num=1&min=' + min + '&max=' + max + '&col=1&base=10&format=plain&rnd=new';
    _logger = logger;
    logger.info('started randomizer service', {url: url});
    callback();
};

exports.get = function(callback) {

    //custom log level
    _logger.info('request URL:  ' +  url);
    request.get({url: url}, function(err, response, body) {
        callback(Number(body));
    });
};
//Uses random.org to generate a random integer
var request = require('request');
var url, _logger, _echoservice;

exports.init = function(logger, config, echoservice, callback) {
    var cfg = config.get('randomizer');
    var min = cfg.min || 0;
    var max = cfg.max || 100;
    url = 'http://www.random.org/integers/?num=1&min=' + min + '&max=' + max + '&col=1&base=10&format=plain&rnd=new';
    _logger = logger;
    _echoservice = echoservice;
    callback();
};

exports.get = function(callback) {

    //custom log level
    _logger.useful('request URL:  ' +  url);
    request.get({url: url}, function(err, response, body) {
        _echoservice.echo('Sending number ' + body);
        callback(Number(body));
    });
};
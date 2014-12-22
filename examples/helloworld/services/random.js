//Uses random.org to generate a random integer
exports.metadata = {
    id: "randomizer",
    description: "Random number generator",
    dependencies: ['config', 'logger', 'echo']
};

var request = require('request');
var url, logger, echo;

exports.init = function(server, cfg, callback) {

    var min = cfg.min || 0;
    var max = cfg.max || 100;
    url = 'http://www.random.org/integers/?num=1&min=' + min + '&max=' + max + '&col=1&base=10&format=plain&rnd=new';
    logger = server.get('logger');
    echo = server.get('echo');
    callback();
};

exports.get = function(callback) {

    //custom log level
    logger.useful('request URL:  ' +  url);
    request.get({url: url}, function(err, response, body) {
        echo.echo('Sending number ' + body);
        callback(Number(body));
    });
};
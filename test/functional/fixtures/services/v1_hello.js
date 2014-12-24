exports.metadata = {
    id: "hello",
    description: "V1 Hello Service",
    dependencies: ['config', 'logger']
};

var logger;

exports.init = function(server, cfg, callback) {
    logger = server.get('logger');
    callback();
};

exports.hello = function(txt) {
    logger.info('V1Hello: hello(' + txt + ')');
}
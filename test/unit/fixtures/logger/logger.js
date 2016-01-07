var init = false;

exports.init = function(winstonLogger) {
    init = true;
};

exports.isInit = function() {
    return init;
};
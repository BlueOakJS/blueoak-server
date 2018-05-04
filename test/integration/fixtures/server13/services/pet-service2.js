/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
exports.init = function(logger) {
    logger.info('Pet Service2 initialized');
};

exports.getPets = function() {
    return {
        id: 2,
        name: 'service2 pet'
    };
};

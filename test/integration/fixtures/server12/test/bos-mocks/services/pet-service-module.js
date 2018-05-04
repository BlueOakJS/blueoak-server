/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
exports.init = function(logger) {
    logger.info('Pet Service Module Mock initialized');
};

exports.getPets = function() {
    return {
        id: 993,
        name: 'module mock pet'
    };
};

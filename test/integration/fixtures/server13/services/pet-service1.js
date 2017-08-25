/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
exports.init = function(logger) {
    logger.info('Pet Service1 initialized');
};

exports.getPets = function() {
    return {
        id: 1,
        name: 'service1 pet'
    };
};

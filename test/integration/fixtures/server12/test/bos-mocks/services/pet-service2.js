/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
exports.init = function(logger) {
    logger.info('Dummy Service2 Mock initialized');
};

exports.getPets = function() {
    return {
        id: 992,
        name: 'mock2 pet'
    };
};

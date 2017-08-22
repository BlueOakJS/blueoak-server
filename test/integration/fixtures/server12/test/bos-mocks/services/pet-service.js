/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
exports.init = function(logger) {
    logger.info('Dummy Service Mock initialized');
};

exports.getPets = function() {
    return {
        id: 99,
        name: 'mock pet'
    };
};

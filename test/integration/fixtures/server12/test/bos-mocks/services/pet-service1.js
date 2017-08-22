/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
exports.init = function(logger) {
    logger.info('Dummy Service1 Mock initialized');
};

exports.getPets = function() {
    return {
        id: 991,
        name: 'mock1 pet'
    };
};

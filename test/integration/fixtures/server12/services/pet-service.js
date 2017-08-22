/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
exports.init = function() {
    throw new Error('Pet Service initialized');
};

exports.getPets = function() {
    return {
        id: 1,
        name: 'service pet'
    };
};

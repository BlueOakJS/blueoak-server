/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */

var logger = services.get('logger');

exports.init = function(swagger) {
    swagger.addFormat('pet-tag', function(data, schema) {
        //check that a tag is uppercase
        if (data !== data.toUpperCase()) {
            return 'Pet tag must be all uppercase';
        }
    });
};

exports.findPets = function(req, res, next) {
    res.status(200).json([]);
};

exports.findPetById = function(req, res, next) {
    logger.debug('Fetching pet %s', req.params.id);
    res.status(200).json({});
};

exports.addPet = function(req, res, next) {
    res.status(201).json({});
};

exports.deletePet = function(req, res, next) {
    res.status(200).json({});
};
/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */

var _ = require('lodash');

exports.init = function (app, logger) {

    app.use(function (err, req, res, next) {

        //Validation errors are thrown by the swagger validator.
        //The can wrap a tv4 validation error which are passed under subErrors
        if (err.name === 'ValidationError') {
            var payload = {
                message: err.message,
                status: 422,
                type: 'ValidationError',
                source: err.source
            };

            if (err.subErrors) {
                payload.validation_errors = [];
                err.subErrors.forEach(function (subError) {
                    payload.validation_errors.push(
                        _.pick(subError, ['message', 'schemaPath', 'model', 'code', 'field', 'in'])
                    );
                });
            }
            res.status(422).json(payload);
        } else {
            logger.error(err.message, err.stack);
            res.status(500).send(err.message);
        }

    });
};

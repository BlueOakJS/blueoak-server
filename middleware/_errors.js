/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
exports.init = function (app, logger) {

    app.use(function (err, req, res, next) {

        //Validation errors are thrown by the swagger validator.
        //The can wrap a tv4 validation error which are passed under subErrors
        if (err.name === 'ValidationError') {
            var payload = {
                message: err.message,
                status: 422,
                type: 'ValidationError'
            };

            if (err.subErrors) {
                payload.validation_errors = [];
                err.subErrors.forEach(function(subError) {
                    payload.validation_errors.push({
                        message: subError.message,
                        field: subError.dataPath,
                        schemaPath: subError.schemaPath,
                        model: subError.model
                    });
                });
            }
            res.status(422).json(payload);
        } else {
            logger.error(err.stack);
            res.status(500).send(err.message);
        }

    });
};

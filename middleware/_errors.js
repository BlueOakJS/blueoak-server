/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
exports.init = function (app, logger) {

    app.use(function (err, req, res, next) {
        var errorBody;

        //Validation errors are thrown by the swagger validator.
        //The can wrap a tv4 validation error which are passed under subErrors
        if (err.name === 'ValidationError') {
            errorBody = {
                message: err.message,
                status: 422,
                type: err.name
            };

            if (err.subErrors) {
                errorBody.validation_errors = [];
                err.subErrors.forEach(function(subError) {
                    errorBody.validation_errors.push({
                        message: subError.message,
                        field: subError.dataPath,
                        schemaPath: subError.schemaPath,
                        model: subError.model
                    });
                });
            }
        } else if (err.name === 'SecurityError') {
            errorBody = {
                message: err.message,
                status: err.challenge ? 401 : 403,
                type: err.name
            };
            
            if (errorBody.status === 401) {
                res.set('WWW-Authenticate', err.challenge);
            }
        }
        
        if (errorBody) {
            res.status(errorBody.status || 500).send(errorBody);
        }
        else {
            logger.error(err.stack);
            res.status(500).send(err.message);
        }

    });
};

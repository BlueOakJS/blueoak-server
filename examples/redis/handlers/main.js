/* eslint-disable lodash/prefer-lodash-typecheck */
/* eslint-disable lodash/prefer-is-nil */
/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
exports.init = function (app, cache, logger) {

    app.get('/cache', function (req, res, next) {

        cache.get('/main/counter', function (err, val) {

            if (err) {
                return next(err);
            }

            //if we don't have a value for counter, set it to 1
            if (typeof val === 'undefined' || val === null) {
                val = 1;
                cache.set('/main/counter', val);
            }

            //return response
            res.json({val: val});

            //increment
            val = val + 1;
            cache.set('/main/counter', val);
        });
    });

};
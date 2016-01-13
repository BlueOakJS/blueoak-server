/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
module.exports.init = function (app, logger, echoService) {
    logger.info('init my-handler');
    app.get('/my-handler', function (req, res) {
        echoService.echo('calling my-handler');
        res.json({});
    });
};

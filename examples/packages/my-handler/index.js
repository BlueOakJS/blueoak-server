module.exports.init = function(app, logger, echoService) {
    logger.info('init my-handler');
	app.get('/my-handler', function(req, res) {
        echoService.echo('calling my-handler');
		res.json({});
	});
};

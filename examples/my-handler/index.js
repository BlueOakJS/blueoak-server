module.exports.init = function(app) {
	app.get('/my-handler', function(req, res) {
		res.json({});
	}
}

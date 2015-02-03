//all the endpoints here are exposed through /test/test2

module.exports.init = function(app) {
    app.get('/hello', function (req, res) {

        res.status(200).json({hello: "world"});
    });

}
//all the endpoints here are exposed through /test

module.exports.init = function(app) {
    app.get('/hello', function (req, res) {

        res.status(200).json({hello: "world"});
    });

}
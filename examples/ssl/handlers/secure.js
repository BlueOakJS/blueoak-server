module.exports.init = function(app) {
    app.get('/hello', function (req, res) {
        res.status(200).send('Secure connection? ' + req.secure);
    });
};
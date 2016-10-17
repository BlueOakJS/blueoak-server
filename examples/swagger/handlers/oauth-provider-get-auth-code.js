var sendAuthCode = function (req, res, next) {
    res.statusCode = 302;
    res.setHeader('location', req.query.redirect_uri + '?state=' + req.query.state + '&code=authcode');
    res.send();
};

exports.init = function (app) {
    app.get('/auth-code', sendAuthCode);
};

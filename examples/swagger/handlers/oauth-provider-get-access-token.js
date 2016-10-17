
var sendAccessToken = function (req, res) {
    res.json({accessToken: 'access'});
};

var redirectWithAccessToken = function (req, res) {
    /*
    A real oauth provider would use this in the implicit flow to validate user credentials,
    authorize the app to access whatever scopes were requested. Then it would redirect to
    the redirect_uri (present in this request), adding the access token as a uri fragment.
    User defined code must handle this redirect with some client side javascript to extract the
    token from the uri fragment.
     */
    res.statusCode = 302;
    res.setHeader('location', req.query.redirect_uri + '#state=' + req.query.state +
        '&token_type=bearer&access_token=access_token');
    res.send();
};

exports.init = function (app) {
    app.post('/access-token', sendAccessToken);
    app.get('/access-token', redirectWithAccessToken);
};

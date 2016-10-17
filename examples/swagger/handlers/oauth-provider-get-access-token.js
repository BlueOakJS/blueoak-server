
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
    res.sendStatus(200);
};

exports.init = function (app) {
    app.post('/access-token', sendAccessToken);
    app.get('/access-token', redirectWithAccessToken);
};

var oauthService;

module.exports = {
    init : init
};

function init(app, oauth2) {
    oauthService = oauth2;
    app.get('/oauth-redirect', handleRedirect);
}

function handleRedirect(req, res) {
    oauthService.accessCodeRedirect(req, res);
}

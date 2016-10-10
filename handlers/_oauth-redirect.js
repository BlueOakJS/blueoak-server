var _ = require('lodash');
var oauthService;

module.exports = {
    init : init
};

function init(app, oauth2) {
    oauthService = oauth2;
    app.get('/oauth-redirect', handleRedirect);
}

function handleRedirect(req, res) {
    if (!req.query.code) {
        //should have auth code at this point
    } else if (!oauthService.getRequestState(req.query.state)) {//check for XSRF
        //log warning about possible xsrf attack
    } else {
        oauthService.getTokenData(req, res, function (tokenData) {
            req.bos.authenticationData = tokenData;
            var originalState = oauthService.getRequestState(req.query.state);
            _.merge(req, originalState.req);
            _.merge(res, originalState.res);
            //this should make it so that an auth code will only get used once
            oauthService.deleteRequestState(req.query.state);
            originalState.next();
        });
    }
}

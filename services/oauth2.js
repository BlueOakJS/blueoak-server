var request = require('request');

var cfg;
var clientId;
var clientSecret;
var redirectURI;
var implicitRedirectUri;
//map of security req to oauth2 instance
var routeOAuthMap = {};

module.exports = {
    init : init,
    OAuth2: OAuth2,
    accessCodeRedirect: accessCodeRedirect,
    addOAuthInstance: addOAuthInstance,
    getOAuthInstance: getOAuthInstance
};

function addOAuthInstance (securityReq, oauthInstance) {
    routeOAuthMap[securityReq] = oauthInstance;
}

function getOAuthInstance (securityReq) {
    return routeOAuthMap[securityReq];
}

function init(config, logger) {
    cfg = config.get('oauth');
    if (cfg) {
        clientId = cfg.clientId;
        clientSecret = cfg.clientSecret;
        redirectURI = cfg.redirectURI;
        implicitRedirectUri = cfg.implicitRedirectUri;
        if (config.get('express').middleware.indexOf('session') < 0) {
            logger.warn('oauth requires that session be enabled.');
        }
    }
}

function OAuth2(authorizationUrl, flow, tokenUrl) {
    this.authorizationUrl = authorizationUrl;
    this.flow = flow;
    this.tokenUrl = tokenUrl;
    this.stateIds = {};
}

function accessCodeRedirect(req, res) {
    var securityReq = req.query.state.split('-')[0];
    var oauth = getOAuthInstance(securityReq);
    if (!req.query.code) {
        //should have auth code at this point
    } else if (!oauth.isValidState(req.query.state)) {//check for XSRF
        //log warning about possible xsrf attack
    } else {
        oauth.getTokenData(req, res, function (tokenData) {
            req.session.bosAuthenticationData = tokenData;
            req.sessionOptions.httpOnly = false; //needs to be set for CORS
            //this should make it so that an auth code will only get used once
            oauth.deleteRequestState(req.query.state);
            res.sendStatus(200);
        });
    }
}

OAuth2.prototype.redirectToAuthorizationUrl = function (req, res, scopes, stateId) {
    var queryString = '?response_type=code&client_id=';
    queryString += clientId;
    queryString += '&redirect_uri=' + redirectURI;
    queryString += '&scope=' + scopes.join(' ');
    queryString += '&state=' + stateId;
    res.status(302);
    res.setHeader('location', this.authorizationUrl + queryString);
    res.send();
};

OAuth2.prototype.redirectToAuthorizationUrlImplicit = function (req, res, scopes, stateId) {
    var queryString = '?response_type=token&client_id=';
    queryString += clientId;
    queryString += '&redirect_uri=' + implicitRedirectUri;
    queryString += '&scope=' + scopes.join(' ');
    queryString += '&state=' + stateId;
    res.status(302);
    res.setHeader('location', this.authorizationUrl + queryString);
    res.send();
};

OAuth2.prototype.startOAuth = function (securityReq, scopes, req, res) {
    var stateId = securityReq + '-' + Math.random();
    if (this.flow === 'accessCode') {
        this.addRequestState(stateId, req, res);
        this.redirectToAuthorizationUrl(req, res, scopes, stateId);
    } else if (this.flow === 'implicit') { //user defined redirect should validate the state parameter
        this.redirectToAuthorizationUrlImplicit(req, res, scopes, stateId);
    } else {
        //unsupported flow
    }
};

OAuth2.prototype.addRequestState = function (stateId) {
    this.stateIds[stateId] = true;
};

OAuth2.prototype.isValidState = function (stateId) {
    return this.stateIds[stateId];
};

OAuth2.prototype.deleteRequestState = function (stateId) {
    this.stateIds[stateId] = undefined;
};

OAuth2.prototype.getTokenData = function (req, res, callback) {
    var form = {grant_type: 'authorization_code'};
    form.code = req.query.code;
    form.clientId = clientId;
    form.clientSecret = clientSecret;
    form.redirectURI = redirectURI;
    request.post({url: this.tokenUrl, form: form}, function (err, resp, body) {
        /*check response status*/
        //we will let user defined middleware take it from here.
        // At a minimum the response will contain parameters listed here:
        //  https://tools.ietf.org/html/rfc6749#section-5.1
        //anything else is beyond the oauth2 spec and is provider specific
        callback(JSON.parse(body));
    });
};




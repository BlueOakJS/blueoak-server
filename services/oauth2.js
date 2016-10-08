var _ = require('lodash'),
    request = require('request'),
    jwt = require('jsonwebtoken');

var cfg;
var clientId;
var clientSecret;
var redirectUri;
//map of route to oauth2 instance in order to maintain state between requests during oauth process
var routeOAuthMap = {};
var requestStateMap = {};

module.exports = {
    init : init,
    OAuth2: OAuth2
};
//look for token, if is there and hasn't expired then boom. If it has expired then refresh token
//look for authorization code, if not there redirect to authorization url with required scopes
//get auth code, send request to token url with auth code to get back token

function init(config) {
    cfg = config.get('oauth');
    clientId = cfg.clientId;
    clientSecret = cfg.clientSecret;
    redirectUri = cfg.redirectUri;
}

function OAuth2(authorizationUrl, flow, tokenUrl, scopes) {
    this.authorizationUrl = authorizationUrl;
    this.flow = flow;
    this.tokenUrl = tokenUrl;
    this.scopes = scopes;
}

function redirectToAuthorizationUrl (req, res, stateId) {
    var queryString = '?response_type=code&requestclientId=';
    queryString += clientId;
    queryString += '&redirect_uri=' + redirectUri;
    queryString += '&scope=' + this.scopes.join(' ');
    queryString += '&state=' + stateId;
    res.statusCode = 302;
    res.headers['location'] = this.authorizationUrl + queryString;
    res.send();
}

function addRequestState (stateId, req, res, next) {
    requestStateMap[stateId] = {req: req, res: res, next: next};
}

OAuth2.prototype.startOAuth = function (req, res, next) {
    if (this.flow === 'accessCode') {
        redirectToAuthorizationUrl(req, res);
    } else {
        //unsupported flow
    }
    addRequestState(Math.random(), req, res, next);
};

OAuth2.prototype.addOAuthInstance = function (route, oauthInstance) {
    routeOAuthMap[route] = oauthInstance;
};

OAuth2.prototype.getOAuthInstance = function (route) {
    return routeOAuthMap[route];
};

OAuth2.prototype.getRequestState = function (stateId) {
    return requestStateMap[stateId];
};

OAuth2.prototype.deleteRequestState = function (stateId) {
    requestStateMap[stateId] = undefined;
};

OAuth2.prototype.getTokenData = function (req, res, callback) {
    var form = {grant_type: 'authorization_code'};
    form.code = req.query.code;
    form.clientId = clientId;
    form.clientSecret = clientSecret;
    form.redirectUri = redirectUri;
    request.post({url: this.tokenUrl, form: form}, function (err, resp, body) {
        /*check response status*/
        //we will let user defined middleware take it from here.
        // At a minimum the response will contain parameters listed here:
        //  https://tools.ietf.org/html/rfc6749#section-5.1
        //anything else is beyond the oauth2 spec and is provider specific
        callback(JSON.parse(body));
    });
};

function authenticate() {

}

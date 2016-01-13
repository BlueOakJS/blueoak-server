/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
/*
 * This is an auth service that registers an auth method called "google-oauth".
 *
 * For configuring, include a clientId, clientSecret, and callbackPath, and optional profile.
 *
 * A route will be registered at the callback path that can take an auth code.
 * After authenticating, the request.user object will look like:
 * {
 *  "id": "103117966615020283234",
 *  "email": "user@gmail.com",
 *  "access_token": "..."
 * }
 *
 * If profile === true, then an additional request will be made to get the google profile
 * data and place it in the "profile" field of request.user.
 */
var _ = require('lodash'),
    request = require('request'),
    jwt = require('jsonwebtoken'),
    getRawBody = require('raw-body');

var debug = require('debug')('google-oauth');

var _cfg;
var TOKEN_URL = 'https://www.googleapis.com/oauth2/v3/token';
var LOGOUT_URL = 'https://accounts.google.com/o/oauth2/revoke';
var PROFILE_URL = 'https://www.googleapis.com/plus/v1/people/me';



module.exports.init = function(app, logger, config) {

    _cfg = config.get('google-oauth');

    if (_.keys(_cfg).length === 0) { //not configured
        return;
    }

    if (config.get('express').middleware.indexOf('session') < 0) {
        logger.error('google-oauth requires that session be enabled.');
        return;
    }

    if (!_cfg.clientId) {
        logger.error('Missing clientId for google-oauth');
    }

    if (!_cfg.clientSecret) {
        logger.error('Missing clientSecret for google-oauth');
    }

    if (_cfg.callbackPath) {
        app.all(_cfg.callbackPath, setAuthCodeOnReq, authCodeCallback);
    } else {
        logger.error('Missing callbackPath for google-oauth');
    }

    if (_cfg.signoutPath) {
        app.all(_cfg.signoutPath, signOutUser);
    }

};

//Look for an auth code on a request.
//The code is either stored on a query param, in a JSON POST body, or as a raw POST body.
//If found, it sets req.code, otherwise continue on.
//Uses raw-body library to get the request body so that bodyParser doesn't have to be configured.
function setAuthCodeOnReq(req, res, next) {
    if (req.query.code) {
        req.code = req.query.code;
        debug('Found auth code %s on query param', req.code);
        return next();
    }

    //look for something like {"code": "..."}
    if (req.body.code) {
        req.code = req.body.code;
        debug('Found auth code %s in JSON body', req.code);
        return next();
    }

    getRawBody(req, function(err, string) {
        if (err) {
            debug(err);
        }
        if (string.toString().length > 0) {
            req.code = string.toString();
            debug('Found auth code %s in body', req.code);
        }
        next();
    });
}

module.exports.authenticate = function(req, res, next) {
    if (req.session.auth) {
        if (req.session.auth.expiration > Date.now()) {
            setUserData(req);
            debug('Access token %s is valid for %s seconds', req.session.auth.id, (req.session.auth.expiration - Date.now()) / 1000);
            return next();
        } else {
            debug('Access token expired for %s.', req.session.auth.id);
            
            if (!req.session.auth.refresh_token) {
                debug('No refresh token available for %s.', req.session.auth.id);
                return res.status(401).send('Access token expired');
            }
            
            var profile = req.session.auth.profile;
            var tokenData = {
                refresh_token: req.session.auth.refresh_token,
                client_id: _cfg.clientId,
                client_secret: _cfg.clientSecret,
                grant_type: 'refresh_token',
                redirect_uri: _cfg.redirectURI
            };

            getToken(tokenData, function (err, authData) {
                if (err) {
                    debug('Error getting new access token: %s', err);
                    return res.sendStatus(401);
                }
                req.session.auth = authData;
                if (profile) {
                    req.session.auth.profile = profile;
                }
                setUserData(req);
                return next();
            });
        }
    } else {
        res.sendStatus(401); //not authenticated
    }
};

function setUserData(req) {
    var auth = req.session.auth;
    req.user = {
        id: auth.id,
        email: auth.email,
        access_token: auth.access_token
    };

    //profile is optional
    if (auth.profile) {
        req.user.profile = auth.profile;
    }
}


//This gets called when someone hits the auth code callback endpoint
//It expects that a valid google auth code is supplied through either the "code" query param
//or in the request body.  Let's setAuthCodeOnReq handle getting the auth code.
//If anything fails, it returns an error status, otherwise a 200
function authCodeCallback(req, res, next) {
    var code = req.code;
    if (!code) {
        return res.status(400).send('Missing auth code');
    }

    var tokenData = {
        code: code,
        client_id: _cfg.clientId,
        client_secret: _cfg.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: _cfg.redirectURI
    };

    getToken(tokenData, function (err, authData) {

        if (err) {
            debug('Error getting new access token: %s', err);
            return res.sendStatus(401);
        } else {
            req.session.auth = authData;

            if (_cfg.profile === true) { //optional step to get profile data
                debug('Requesting profile data');
                getProfileData(authData.access_token, function(err, data) {
                    if (err) {
                        debug('Error getting profile data: %s', err.message);
                        return next(err);
                    }
                    req.session.auth.profile = data;
                    res.sendStatus(200);
                });
            } else {
                res.sendStatus(200);
            }


        }
    });
}

//Revoke the access token, refresh token, and cookies
function signOutUser(req, res, next) {
    debug('Signing out user');
    //make a best attempt effort at revoking the tokens
    var accessToken = req.session.auth ? req.session.auth.access_token: null;
    var refreshToken = req.session.auth ? req.session.auth.refresh_token: null;
    if (accessToken) {
        debug('Revoking access token');
        request.get({
            url: LOGOUT_URL,
            qs: {
                token: accessToken
            }
        }, function(err, response, body) {
            if (err) {
                debug('Error revoking access token', err.message);
            } else {
                debug('Revoked access token, %s', response.statusCode);
            }
        });
    }

    if (refreshToken) {

        request.get({
            url: LOGOUT_URL,
            qs: {
                token: refreshToken
            }
        }, function (err, response, body) {
            if (err) {
                debug('Error revoking refresh token', err.message);
            } else {
                debug('Revoked refresh token, %s', response.statusCode);
            }
        });
    }
    delete req.session.auth;
    res.sendStatus(200);
}

/**
 * Makes a call to the google token service using the given data
 *
 * Data should either have a grant type of refresh_token or authorization_code
 * Callback is of the form callback(err, result) where result contains some auth data, such as
 * id, email, access_token, expiration, and refresh_token
 * @param data
 * @param callback
 */
function getToken(data, callback) {

    request.post({url: TOKEN_URL, form: data}, function (err, resp, body) {
        
        //this would be something like a connection error
        if (err) {
            return callback({statusCode: 500, message: err.message});
        }

        if (resp.statusCode !== 200) { //error
            return callback({statusCode: resp.statusCode, message: JSON.parse(body)});
        } else {
            debug('Got response back from token endpoint', body);
            /*
             Body should look like
             {
             "access_token": "ya29.UQH0mtJ5M-CNiXc-mDF9II_R7CRzRQm6AmxIc6TjtouR_HxUtg-I1icHJy36e065UUmIL5HIdfBijg",
             "token_type": "Bearer",
             "expires_in": 3600,
             "refresh_token": "1/7EBZ1cWgvFaPji8FNuAcMIGHYj3nHJkNDjb7CSaAPfM",
             "id_token": "..."
             }
             */
            var authData = JSON.parse(body);

            //id_token is a JWT token.  Since we're getting this directly from google, no need to authenticate it
            var idData = jwt.decode(authData.id_token);

            /*
             Sample id data
             { iss: 'accounts.google.com',
             sub: '103117966615020283234',
             azp: '107463652566-jo264sjf04n1uk17i2ijdqbs2tuu2rf0.apps.googleusercontent.com',
             email: 'foo@gmail.com',
             at_hash: 'qCF-HkLhiGtrHgv6EsPzQQ',
             email_verified: true,
             aud: '107463652566-jo264sjf04n1uk17i2ijdqbs2tuu2rf0.apps.googleusercontent.com',
             iat: 1428691188,
             exp: 1428694788 }
             */
            return callback(null, {
                id: idData.sub,
                email: idData.email,
                access_token: authData.access_token,
                expiration: Date.now() + (1000 * authData.expires_in),
                refresh_token: authData.refresh_token || data.refresh_token
            });
        }
    });
};

function getProfileData(token, callback) {
    request.get(PROFILE_URL, {'auth': {'bearer': token}},
        function (err, resp, body) {
            if (err) {
                return callback(err);
            }
            callback(null, JSON.parse(body));
        }
    );
}
/*
 * Copyright 2015-2016 PointSource, LLC.
 * MIT Licensed
 */

var request = require('request'),
    jwt = require('jsonwebtoken'),
    base64 = require('base64url'),
    getPem = require('rsa-pem-from-mod-exp');

var _discovery = null, _certs, _pems = {};
var _cfg = null;

module.exports.init = function (app, logger, config, auth, callback) {

    var cfg = config.get('google-jwt');
    _cfg = cfg;
    if (cfg.clientId) {

        logger.warn('Using experimental google-jwt auth');

        //get the discovery data, which we need to look up certificates
        request.get('https://accounts.google.com/.well-known/openid-configuration', function (err, resp, body) {
            if (err) {
                return callback(err);
            }

            if (resp.statusCode !== 200) {
                return callback(new Error('Could not access google discovery service.'));
            }

            _discovery = JSON.parse(body);

            //Download the certificates
            request.get(_discovery.jwks_uri, function (err, resp, body) {
                if (err) {
                    return callback(err);
                }

                if (resp.statusCode !== 200) {
                    return callback(new Error('Could not access google certs.'));
                }

                _certs = JSON.parse(body);

                //convert the jwks to pem certificates
                _certs.keys.forEach(function (key) {
                    _pems[key.kid] = getPem(key.n, key.e);
                });
                callback();
            });
        });
    } else {
        return callback(); //nothing to do
    }

};

//either return token from the Bearer, Bearer <token>, or false if malformed
function extractToken(token) {
    var regex = /^Bearer\s(\S+)$/i;
    var result = regex.exec(token);
    return result ? result[1] : false;
}

module.exports.authenticate = function (req, res, next) {
    var bearerToken = req.headers['authorization'];
    if (bearerToken) {
        
        var bearer = extractToken(bearerToken);
        if (!bearer) {
            return res.sendStatus(400);  //bad request, malformed beared
        }
        
        var bearer = bearerToken.split(' ')[1];

        //we need to decode just the header of the jwt so that we can figure out the kid
        //TODO: Validate that bearer token is well formed before trying to split
        var parts = bearer.split('.');
        try {
            var header = JSON.parse(base64.decode(parts[0]));
            var kid = header.kid;

            //with the kid, we can look up the corresponding pem
            var pem = _pems[kid];
            
            //for some reason, the iss can be either accounts.google.com or https://accounts.google.com
            //let's go ahead and use the one from the token itself
            var payload = JSON.parse(base64.decode(parts[1]));
            var iss = _discovery.issuer;
            if (payload.iss === 'accounts.google.com') {
                iss = 'accounts.google.com';
            }

            jwt.verify(bearer, pem, {
                issuer: iss,
                algorithms: _discovery.id_token_signing_alg_values_supported,
                audience: _cfg.clientId
            }, function (err, decoded) {
                //console.log(decoded)
                if (err) {
                    return res.status(401).send(err.message);
                }
                req.user = {
                    email: decoded.email,
                    id: decoded.sub
                };
                next();
            });
        } catch (err) {
            //invalid token
            res.sendStatus(401);
        }
    } else {
        res.sendStatus(401);
    }
};

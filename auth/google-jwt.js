/* Copyright © 2015 PointSource, LLC. All rights reserved. */

var _ = require('lodash'),
    request = require('request'),
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
    }


}

module.exports.authenticate = function (req, res, next) {
    var bearerToken = req.headers["authorization"];
    if (bearerToken) {
        var bearer = bearerToken.split(' ')[1];

        //we need to decode just the header of the jwt so that we can figure out the kid
        var parts = bearer.split('.');
        try {
            var header = JSON.parse(base64.decode(parts[0]));
            var kid = header.kid;

            //with the kid, we can look up the corresponding pem
            var pem = _pems[kid];
            jwt.verify(bearer, pem, {
                issuer: _discovery.issuer,
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
}

var request = require('request');

module.exports.getSomething = function (req, res, next) {
    res.json({email: req.user.email, profile: req.user.profile});
}
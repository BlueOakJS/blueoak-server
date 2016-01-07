
module.exports.getSomething = function (req, res, next) {
    res.json({email: req.user.email, profile: req.user.profile});
};

module.exports.getSomething2 = function (req, res, next) {
    res.json({email: req.user.email});
};
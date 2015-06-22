
module.exports.getSomething = function (req, res, next) {
    res.json({id: req.user.id});
}

module.exports.getSomething2 = function (req, res, next) {
    res.json({id: req.user.id, age: req.user.profile.age});
}
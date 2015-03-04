
//This is a declared route from the routes.json
module.exports = {
    bar: function(req, res, next) {
        res.json({foo: 'bar'});
    }
}
/* Copyright © 2015 PointSource, LLC. All rights reserved. */

//This is a declared route from the routes.json
module.exports = {
    bar: function(req, res, next) {
        res.json({foo: 'bar'});
    }
};
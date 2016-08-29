/**
 * Created by shepp on 8/27/2016.
 */
var logger = services.get('logger');

exports.init = function() {

};

exports.getProducts = function(req, res, next) {
    res.status(200).json([
        {product_type: "ToyProduct"},
            {product_type: "FoodProduct"}
            ]
        );
};
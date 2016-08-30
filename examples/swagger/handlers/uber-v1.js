/**
 * Created by shepp on 8/27/2016.
 */
var logger = services.get('logger');

exports.init = function() {

};

exports.getProducts = function(req, res, next) {
    res.status(200).json([
            {product_type: "ToyProduct", product_id:"1", toy_type: "car", some_bs: "hola!",
                labels: {name :"mattel", label_type: "ToyLabel"}, dummy: ["mo money mo problems", {message: "I am an object"}]},
            {product_type: "FoodProduct",  product_id:"2"}
        ]);
};

exports.init = function() {

};

exports.getFunTimeById = function(req, res, next) {
    res.status(200).json({
        'curiousPeople': [
            {
                'kind': 'OtherPerson',
                'curiousPersonReqField': 'hey?',
                'enthusiasticPersonReqField': 'hola!'
            }
        ]
    });
};

exports.addFunTime = function(req, res, next) {
    res.status(204).send();
};

exports.deleteFunTimeById = function(req, res, next) {
    res.status(204).send();
};



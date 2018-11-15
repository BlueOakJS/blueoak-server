/* eslint-disable lodash/prefer-noop */
exports.init = function() {

};

exports.getFunTimeById = function(req, res, next) {
    res.status(200).json({
        'curiousPeople': [
            {
                'kind': 'OtherPerson',
                'curiousPersonReqField': 'hey!',
                'enthusiasticPersonReqField': 'hola!'
            }
        ]
    });
};


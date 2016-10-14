
exports.init = function () {

};

exports.getApiUser = function (apiId, done) {
    done(null, {name: 'joe', getApiKey: function () {
        return 'JfOJ15SI7EGjDLX1h8zPB19Zr88ONMPKbBQJozMI0Ag';
    }});
};
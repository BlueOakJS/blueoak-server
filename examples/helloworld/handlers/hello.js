
module.exports.init = function(server, express, done) {

    //Default is one of the app's defined in the config
    express.default.get('/hello', function(req, res) {
        server.randomizer.get(function(number) {
            res.status(200).send('hello world, here is a random number!...' + number);
        });
    });

    //Use to validate csrf check
    express.default.post('/hello', function(req, res) {
        res.status(200).send('POST worked');
    });

    //Use to validate CORS
    express.default.put('/hello', function(req, res) {
        res.status(200).send('PUT worked');
    });



    express.admin.get('/admin', function(req, res) {
        res.status(200).send('Secure connection? ' + req.secure);
    });

    done();

};
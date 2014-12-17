
module.exports.init = function(app, server, done) {

    app.get('/hello', function(req, res) {
        server.randomizer.get(function(number) {
            res.status(200).send('hello world, here is a random number!...' + number);
        });

    });

    done();

}
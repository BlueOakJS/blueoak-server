
module.exports.init = function(app, randomizer, monitor) {
    app.get('/hello', monitor.express('hello_ENDPOINT'), function(req, res) {
        var rcount = req.session.rcount || 0;
        rcount += 1;
        req.session.rcount = rcount;
        randomizer.get(function(number) {
            res.status(200).send('hello world, here is a random number!...' + number + '.' +
            '  You have used this service ' + rcount + ' times.');
        });
    });

    //Use to validate csrf check
    app.post('/hello', function(req, res) {
        console.log(typeof req.body, req.body);
        res.status(200).send('POST worked. Body is ' + req.body);
    });

    //Use to validate CORS
    app.put('/hello', function(req, res) {
        res.status(200).send('PUT worked');
    });

    app.get('/', function(req, res) {
        res.status(200).send('GET worked');
    });

    app.get('/foo/:bar', function(req, res) {
        setTimeout(function() {
            res.status(200).send('Got :bar of value ' + req.params.bar);
        }, 1000);

    });


    app.get('/admin', function(req, res) {
        res.status(200).send('Secure connection? ' + req.secure);
    });


};
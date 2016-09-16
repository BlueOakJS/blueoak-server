/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var request = require('request').defaults({ jar: true }); //need cookies enabled since this is cookie session

var assert = require('assert'),
    util = require('./launchUtil');

describe('SERVER3 - test session support', function () {
    this.timeout(5000);
    before(function (done) {
        util.launch('server3', done);
    });

    after(function (done) {
        util.finish(done);
    });


    it('Should let me put and retrieve data from the session', function (done) {
        //the post sets session data
        request.post({
            url: 'http://localhost:' + (process.env.PORT || 5000) + '/session',
            json: {
                foo: 'bar'
            }
        }, function (err, resp, body) {
            assert.equal(null, err);

            //get retrieves session data
            request.get('http://localhost:' + (process.env.PORT || 5000) + '/session',
                function (err, resp, body) {
                    assert.equal(null, err);
                    var data = JSON.parse(body);
                    assert.equal('bar', data.foo);
                    done();
                }
            );
        });
    });


});
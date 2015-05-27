/* Copyright © 2015 PointSource, LLC. All rights reserved. */
var sprout = require('../../index'),
    path = require('path'),
    request = require('request').defaults({jar: true}), //need cookies enabled since this is cookie session
    assert = require('assert'),
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
        request.post({url: 'http://localhost:' + (process.env.PORT || 5000) + '/session', json: {foo: 'bar'}}, function(err, resp, body) {
            assert.ok(!err);

            //get retrieves session data
            request.get('http://localhost:' + (process.env.PORT || 5000) + '/session', function(err, resp, body) {
                assert.ok(!err);
                var data = JSON.parse(body);
                assert.equal('bar', data.foo);
                done();
            });
        });
    });


});
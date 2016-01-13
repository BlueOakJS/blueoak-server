/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var assert = require('assert'),
    subrequire = require('../../lib/subRequire'),
    path = require('path');

/* uses the following load order
 * First try within the app's node_modules
 * Next, if this module is required by another module, load it relative to that other module
 * Finally, use the normal require call, which will look in the BO server's node_modules
 */
describe('Subrequire test', function () {


    it('Should load .js files directly', function () {
        var mod = subrequire(path.resolve(__dirname, './fixtures/subrequire/test1/test.js'));
        assert.equal(mod.__id, 'test');
        assert.equal(mod.test(), 'test1');
    });

    it('Should load modules from app dir', function () {
        global.__appDir = path.resolve(__dirname, './fixtures/subrequire/test2');
        var mod = subrequire('test');
        assert.equal(mod.__id, 'test');
        assert.equal(mod.test(), 'test2');
    });

    it('Should be able to load from the normal require path', function () {
        var mod = subrequire('express');
        assert.equal(mod.__id, 'express');
    });

    it('Should load from app first', function () {
        global.__appDir = path.resolve(__dirname, './fixtures/subrequire/test3');
        var mod = subrequire('express');
        assert.equal(mod.__id, 'express');
        assert.equal(mod.test(), 'test3');
    });

    it('Should load relative to another module', function () {
        global.__appDir = path.resolve(__dirname, './fixtures/subrequire/test4');

        var mod = subrequire('test');
        assert.equal(mod.__id, 'test');
        assert.equal(mod.test(), 'test4');

        var mod = subrequire('express', 'test'); //load relative to test
        assert.equal(mod.__id, 'express');
        assert.equal(mod.test(), 'test4_express');

    });


});

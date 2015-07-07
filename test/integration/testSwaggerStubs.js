/* Copyright © 2015 PointSource, LLC. All rights reserved. */
var sprout = require('../../index'),
    path = require('path'),
    request = require('request').defaults({jar: true}), //need cookies enabled since this is cookie session
    assert = require('assert'),
    util = require('./launchUtil');

describe('SERVER4 - test swagger stub gen', function () {
    
    //TODO: Disabling this for now because it ends up modifies files, which is dangerous.
    //I'd rather things be returned to normal after running the tests
    return it('should test stubs');
    
    this.timeout(5000);
    before(function (done) {
        util.launch('server4', {exec: '../../bin/swagger2js.js'}, done);
    });

    after(function (done) {
        util.finish(done);
    });


    it('Should generate stub handlers files', function () {
        var dir = 'fixtures/server4/handlers';
        var files = ['petstore.js', 'petstore2.js', 'petstore3.js', 'petstore4.js'];
        files.forEach(function (file) {
            var file = path.resolve(__dirname, dir, file);
            var mod = require(file);
            assert.ok(mod.findPets);
            assert.ok(mod.findPetById);
            assert.ok(mod.addPet);
            assert.ok(mod.deletePet);
        });
    });


});

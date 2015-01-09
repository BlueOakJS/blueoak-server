var assert = require("assert"),
    loader = require('../../lib/loader'),
    path = require('path');

describe('DI Loader test1 - basic loading', function () {

    var testLoader;

    beforeEach(function(){
        testLoader = loader();
    });

    afterEach(function(){

        testLoader.unload('service1');
        testLoader.unload('service2');
    });

    it('Should have an empty instance of the loader', function () {
        assert.equal(testLoader.get('someService'), null); //ensure no errors trying to get non-existent service
    });

    it('Should be able to load and initialize both synchronous and asynchronous services', function (done) {
        testLoader.loadServices(path.resolve(__dirname, 'fixtures/loader/test1')); //app services

        var service1 = testLoader.get('service1');
        var service2 = testLoader.get('service2');
        assert.ok(service1, "Not null");
        assert.ok(service2, "Not null");
        assert.equal(service1.isInitialized(), false);
        assert.equal(service2.isInitialized(), false);
        testLoader.init(function() {
            assert.equal(service1.isInitialized(), true);
            assert.equal(service2.isInitialized(), true);
            done();
        });
    });

    it('Should be able to specify an init list', function (done) {
        testLoader.loadServices(path.resolve(__dirname, 'fixtures/loader/test1')); //app services

        var service1 = testLoader.get('service1');
        var service2 = testLoader.get('service2');
        testLoader.init(['service1'], function() {
            assert.equal(service1.isInitialized(), true);
            assert.equal(service2.isInitialized(), false);
            done();
        });
    });

});

describe('DI Loader test2 - errors', function () {

    var testLoader;

    beforeEach(function () {
        testLoader = loader();
    });

    afterEach(function () {
        testLoader.unload('service3');
        testLoader.unload('service4');
    });

    it('Should be able to handle an error asynchronously', function (done) {
        testLoader.loadServices(path.resolve(__dirname, 'fixtures/loader/test2')); //app services

        var service3 = testLoader.get('service3');

        //async error
        testLoader.init(['service3'], function(err) {
            assert.equal(service3.isInitialized(), false);
            assert.ok(err !== null && err.message.indexOf('crap') > -1, "contains an error with a message");
            done();
        });
    });

    it('Should be able to handle an error synchronously', function (done) {
        testLoader.loadServices(path.resolve(__dirname, 'fixtures/loader/test2')); //app services

        var service4 = testLoader.get('service4');

        //async error
        testLoader.init(['service4'], function(err) {
            assert.equal(service4.isInitialized(), false);
            assert.ok(err !== null && err.message.indexOf('crap') > -1, "contains an error with a message");
            done();
        });
    });
});

describe('DI Loader test3 - dependency injection', function () {
    var testLoader;

    beforeEach(function () {
        testLoader = loader();
    });

    afterEach(function () {
        testLoader.unload('service5');
        testLoader.unload('service6');
        testLoader.unload('service7');
    });

    it('Should init services in correct order', function (done) {
        testLoader.loadServices(path.resolve(__dirname, 'fixtures/loader/test3')); //app services

        var service5 = testLoader.get('service5');
        var service6 = testLoader.get('service6');
        var service7 = testLoader.get('service7');
        testLoader.init(function(err) {
            assert.equal(service5.isInitialized(), true);
            assert.equal(service6.isInitialized(), true);
            assert.equal(service7.isInitialized(), true);
            done();
        });
    });

});

describe('DI Loader test4 - dependency injection errors', function () {
    var testLoader;

    beforeEach(function () {
        testLoader = loader();
    });

    afterEach(function () {
        testLoader.unload('service8');
    });

    it('Should get errors for unmet dependencies', function (done) {
        testLoader.loadServices(path.resolve(__dirname, 'fixtures/loader/test4')); //app services

        var service8 = testLoader.get('service8');
        testLoader.init(function(err) {
            assert.ok(err && err.message.indexOf('blah') > -1); //should cause an error about unmet dependency blah
            done();
        });
    });

    it('Should be able to manually inject a dependency', function (done) {
        testLoader.loadServices(path.resolve(__dirname, 'fixtures/loader/test4')); //app services
        testLoader.inject('blah', true);
        var service8 = testLoader.get('service8');
        testLoader.init(function(err) {
            assert.equal(service8.isInitialized(), true);
            done();
        });
    });
});
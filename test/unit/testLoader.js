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
        testLoader.unload('service9');
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

    it('Should be able to manually inject a dependency with another dependency', function (done) {
        testLoader.loadServices(path.resolve(__dirname, 'fixtures/loader/test4')); //app services
        testLoader.inject('blah', true, ['service9']); //blah now depends on service9, which will also be initialized
        var service9 = testLoader.get('service9');
        testLoader.init(function(err) {
            assert.equal(service9.isInitialized(), true);
            done();
        });
    });
});

describe('DI Loader test5 - circular dependencies', function () {
    var testLoader;

    beforeEach(function () {
        testLoader = loader();
    });

    afterEach(function () {
        testLoader.unload('service10');
        testLoader.unload('service11');
    });

    it('Should get circular dependency errors', function (done) {
        testLoader.loadServices(path.resolve(__dirname, 'fixtures/loader/test5')); //app services

        testLoader.init(function(err) {
            assert.ok(err && err.message.indexOf('Cycle found') > -1); //should cause cycle error
            done();
        });
    });

});

describe('DI Loader test6 - test consumers', function () {
    var testLoader;

    beforeEach(function () {
        testLoader = loader();
    });

    afterEach(function () {
        testLoader.unload('service20');
    });

    it('Should be able to initialize consumers', function (done) {
        testLoader.loadServices(path.resolve(__dirname, 'fixtures/loader/test6/services')); //app services
        testLoader.loadConsumers(path.resolve(__dirname, 'fixtures/loader/test6/consumers'), 'foo');

        var service20 = testLoader.get('service20');
        testLoader.init(function(err) {
            testLoader.initConsumers('foo', null, function(err) {
                //both consumers if they were init'd will registered themselves with service20
                assert.ok(service20.get().indexOf('consumer1') > -1);
                assert.ok(service20.get().indexOf('consumer2') > -1);
                done();
            });

        });
    });

    it('Should be able to specify an init list', function (done) {
        testLoader.loadServices(path.resolve(__dirname, 'fixtures/loader/test6/services')); //app services
        testLoader.loadConsumers(path.resolve(__dirname, 'fixtures/loader/test6/consumers'), 'foo');

        var service20 = testLoader.get('service20');
        testLoader.init(function(err) {
            testLoader.initConsumers('foo', ['consumer1'], function(err) {
                //both consumers if they were init'd will registered themselves with service20
                assert.ok(service20.get().indexOf('consumer1') > -1);
                assert.ok(service20.get().indexOf('consumer2') < 0); //consumer2 won't have loaded
                done();
            });

        });
    });

    it('Should be able to have multiple prefixes', function (done) {
        testLoader.loadServices(path.resolve(__dirname, 'fixtures/loader/test6/services')); //app services
        testLoader.loadConsumers(path.resolve(__dirname, 'fixtures/loader/test6/consumers'), 'foo');
        testLoader.loadConsumers(path.resolve(__dirname, 'fixtures/loader/test6/otherConsumers'), 'bar');

        var service20 = testLoader.get('service20');
        testLoader.init(function(err) {
            testLoader.initConsumers('foo', null, function(err) {
                testLoader.initConsumers('bar', null, function(err) {
                    //both consumers if they were init'd will registered themselves with service20
                    assert.ok(service20.get().indexOf('consumer1') > -1);
                    assert.ok(service20.get().indexOf('consumer2') > -1);
                    assert.ok(service20.get().indexOf('otherConsumer1') > -1);
                    done();
                });
            });

        });
    });

    it('Should handle async error during consumer init', function (done) {
        testLoader.loadServices(path.resolve(__dirname, 'fixtures/loader/test6/services')); //app services
        testLoader.loadConsumers(path.resolve(__dirname, 'fixtures/loader/test6/badConsumers'), 'foo');

        var service20 = testLoader.get('service20');
        testLoader.init(function(err) {
            testLoader.initConsumers('foo', ['consumer1'], function(err) {
                assert.ok(err && err.message.indexOf('bad consumer1') > -1);
                done();
            });

        });
    });

    it('Should handle sync error during consumer init', function (done) {
        testLoader.loadServices(path.resolve(__dirname, 'fixtures/loader/test6/services')); //app services
        testLoader.loadConsumers(path.resolve(__dirname, 'fixtures/loader/test6/badConsumers'), 'foo');

        var service20 = testLoader.get('service20');
        testLoader.init(function(err) {
            testLoader.initConsumers('foo', ['consumer2'], function(err) {
                assert.ok(err && err.message.indexOf('bad consumer2') > -1);
                done();
            });

        });
    });

});

describe('DI Loader test7 - test dynamic dependencies', function () {
    var testLoader;

    beforeEach(function () {
        testLoader = loader();
    });

    afterEach(function () {
        testLoader.unload('service12');
        testLoader.unload('service13');
        testLoader.unload('service14');
        testLoader.unload('service15');
    });

    it('Should be able to specify explicit dependencies through getDependencies', function (done) {
        testLoader.loadServices(path.resolve(__dirname, 'fixtures/loader/test7'));
        testLoader.inject('service-loader', testLoader);
        var service12 = testLoader.get('service12');
        var service13 = testLoader.get('service13');
        var service14 = testLoader.get('service14');
        var service15 = testLoader.get('service15');

        testLoader.init(function(err) {
            assert.equal(service12.isInitialized(), true);
            //assert.equal(service13.isInitialized(), true);
            //assert.equal(service14.isInitialized(), true);
            //assert.equal(service15.isInitialized(), true);
            done();
        });
    });

});


describe('DI Loader test8 - test camel case', function () {
    var testLoader;

    beforeEach(function () {
        testLoader = loader();
    });

    afterEach(function () {
        testLoader.unload('service15');
        testLoader.unload('service-one');
    });

    it('Should convert camelCase dependencies to dash-case', function (done) {
        testLoader.loadServices(path.resolve(__dirname, 'fixtures/loader/test8'));
        testLoader.inject('service-loader', testLoader);
        var service15 = testLoader.get('service15');
        var serviceOne = testLoader.get('service-one');

        testLoader.init(function(err) {
            assert.equal(service15.isInitialized(), true);
            assert.equal(serviceOne.isInitialized(), true);
            done();
        });
    });

});

describe('DI Loader test9 - test param mappers', function () {
    var testLoader;

    beforeEach(function () {
        testLoader = loader();
    });

    afterEach(function () {
        testLoader.unload('service30');
    });

    it('Should let me remap the param name during init consumers', function (done) {
        testLoader.loadServices(path.resolve(__dirname, 'fixtures/loader/test9/services')); //app services
        testLoader.loadConsumers(path.resolve(__dirname, 'fixtures/loader/test9/consumers'), 'foo');

        var service30 = testLoader.get('service30');
        testLoader.init(function(err) {
            testLoader.initConsumers('foo', ['consumer10'], function(serviceId, mod) {
                if (serviceId === 'blah') {
                    return 'service30';
                }
                return serviceId;
            }, function(err) {
                done();
            });

        });
    });

});

describe('DI Loader test10 - test services.get', function () {
    var testLoader, services;

    beforeEach(function () {
        testLoader = loader();
        services = testLoader.getRegistry();
    });

    afterEach(function () {
        testLoader.unload('service19');
        testLoader.unload('service18');
    });

    it('Should be able to get a service from the registry synchronously', function (done) {
        testLoader.loadServices(path.resolve(__dirname, 'fixtures/loader/test10')); //app services

        var service19 = services.get('service19');
        assert.equal(service19.isInitialized(), false);

        testLoader.init(['service19'], function(err) {
            service19 = services.get('service19');
            assert.equal(service19.isInitialized(), true);
            done();
        });
    });

    it('Should be able to get a service from the registry asynchronously', function (done) {
        testLoader.loadServices(path.resolve(__dirname, 'fixtures/loader/test10')); //app services

        var service18 = services.get('service18');
        assert.equal(service18.isInitialized(), false);

        //try async get
        services.get('service18', function(mod) {
            assert.equal(mod.isInitialized(), true);
            done();
        });

        testLoader.init(['service18'], function(err) {
        });
    });

});
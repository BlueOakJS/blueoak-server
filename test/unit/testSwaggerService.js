/*
 * Copyright (c) 2015-2018 PointSource, LLC.
 * MIT Licensed
 */
var _ = require('lodash'),
    assert = require('assert'),
    path = require('path'),
    logger = require('../../testlib/mocks/logger'),
    swaggerService = require('../../services/swagger'),
    swaggerUtil = require('../../lib/swaggerUtil'),
    testUtil = require('../../testlib/util');

var swaggerExampleDir = path.resolve(__dirname, '../../examples/swagger'),
    swaggerValidateResponsesConfig = {
        swagger: {
            polymorphicValidation: 'on',
            validateResponseModels: 'error'
        }
    },
    swaggerExampleSpecs = 3,
    swaggerExampleSpecNames = ['api-v1', 'petstore', 'uber-v1'];

describe('Swagger service initialization', function () {

    before(function (callback) {
        global.__appDir = swaggerExampleDir;
        swaggerService.init(logger, testUtil.createConfigService(swaggerValidateResponsesConfig), callback);
    });
    
    it('Gets a list of all spec names', function () {
        var specNames = swaggerService.getSpecNames();
        assert.deepEqual(specNames, swaggerExampleSpecNames);
    });
});

describe('Swagger spec building test', function () {

    it('responses/requests with schema have x-bos-generated-disc-map property', function () {
        var httpMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];
        _.forIn(swaggerService.getSimpleSpecs(), function (spec) {
            _.forIn(spec.paths, function (path, pathKey) {
                _.forIn(path, function (method, methodKey) {
                    if (httpMethods.indexOf(methodKey) != -1) {
                        _.forIn(method.responses, function (response, key) {
                            if (response.schema) {
                                assert.ok(response[swaggerService.discriminatorKeyMap], 'Simple specs ' + key +
                                    ' does not have a x-bos-generated-disc-map property');
                                if (JSON.stringify(response.schema).includes('"discriminator":')) {
                                    assert.ok(
                                        JSON.stringify(response[swaggerService.discriminatorKeyMap])
                                            .includes('"discriminator":'), 
                                        'x-bos-generated-disc-map for ' + pathKey + '/' + key +
                                            ' does not have a discriminator property');
                                }
                            }
                        });
                        _.forIn(method.parameters, function (param, key) {
                            if (param.in === 'body') {//schema required
                                assert.ok(param.schema, 'Simple specs ' + key + ' does not have a schema property');
                                assert.ok(param[swaggerService.discriminatorKeyMap],
                                    'Simple specs ' + key + ' does not have a x-bos-generated-disc-map property');
                                if (JSON.stringify(param.schema).includes('"discriminator":')) {
                                    assert.ok(
                                        JSON.stringify(
                                            param[swaggerService.discriminatorKeyMap])
                                            .includes('"discriminator":'),
                                        'x-bos-generated-disc-map for ' + key +
                                            ' does not have a discriminator property');
                                }
                            }
                        });
                    }
                });
            });
        });
    });
    
    it('definitions have x-bos-generated-disc-map property', function () {
        var modelsWithDiscMapsFromReferences = ['SuperFunTime'];
        _.forIn(swaggerService.getSimpleSpecs(), function (spec) {
            _.forIn(spec.definitions, function (model, modelName) {
                assert.ok(model[swaggerService.discriminatorKeyMap],
                    'Simple specs ' + modelName + ' does not have an x-bos-generated-disc-map property');
                if (model.discriminator || modelsWithDiscMapsFromReferences.includes(modelName)) {
                    assert.ok(!_.isEmpty(model[swaggerService.discriminatorKeyMap]),
                        'Simple specs ' + modelName + ' does not have a complete x-bos-generated-disc-map object');
                } else {
                    assert.ok(_.isEmpty(model[swaggerService.discriminatorKeyMap]),
                        'Simple specs ' + modelName + ' does not have an empty x-bos-generated-disc-map object');
                }
            });
        });
    });

    it('has validation error indicating required field from implementing model is missing', function () {
        var exampleData = require('./data/example.json');
        var map = swaggerService.getSimpleSpecs()['api-v1'].paths['/superfuntime/{id}']
            .get.responses['200'][swaggerService.discriminatorKeyMap];
        var polymorphicValidationErrors = swaggerUtil.validateIndividualObjects(
            swaggerService.getSimpleSpecs()['api-v1'], map, exampleData);
        assert.equal(polymorphicValidationErrors.length, 1);
        assert.ok(polymorphicValidationErrors[0].message.includes('Missing required property'),
            'validation did not identify missing required property');
    });

    it('Model properties can be overridden', function () {
        var curiousPersonDefn = swaggerService.getSimpleSpecs()['api-v1'].definitions.CuriousPerson;
        //kind enum should have been overriden by curious person
        //required property should contain curious person required properties AND
         //any required properties from inherited models
        assert.equal(curiousPersonDefn.properties.kind.enum[0], 'CuriousPerson');
        assert.equal(curiousPersonDefn.required.length, 3);
    });

    it('Has a spec for each top-level spec file', function () {
        assert.equal(_.keys(swaggerService.getSimpleSpecs()).length, swaggerExampleSpecs);
        assert.equal(_.keys(swaggerService.getPrettySpecs()).length, swaggerExampleSpecs);
    });

    it('Specs are plain objects', function () {
        _.forIn(swaggerService.getSimpleSpecs(), function (value, key) {
            assert.ok(_.isPlainObject(value), 'Simple spec ' + key + ' is not a plain object');
        });
        _.forIn(swaggerService.getPrettySpecs(), function (value, key) {
            assert.ok(_.isPlainObject(value), 'Pretty spec ' + key + ' is not a plain object');
        });
    });

    it('Simple specs have no $refs', function () {
        _.forIn(swaggerService.getSimpleSpecs(), function (value, key) {
            assert.ok(!JSON.stringify(value).includes('"$ref":'), 'Simple spec ' + key + ' has a $ref!');
        });
    });

    it('Pretty specs have $refs', function () {
        _.forIn(swaggerService.getPrettySpecs(), function (value, key) {
            assert.ok(JSON.stringify(value).includes('"$ref":'), 'Pretty spec ' + key + ' has no $refs!');
        });
    });

});


describe('Swagger format validators test', function () {

    before(function () {
        swaggerService.addFormat('uppercase', function (data, schema) {
            if (data.toUpperCase() !== data) {
                return 'Must be upper case';
            }
        });
    });

    it('Validate parameter type', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            format: 'uppercase'
        }, 'abc').valid, false);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            format: 'uppercase'
        }, 'ABC').valid, true);
    });

    it('Validate JSON type', function () {

        var data = {
            id: 123,
            name: 'Bob'
        };

        var schema = {
            type: 'object',
            properties: {
                id: {
                    type: 'integer',
                    format: 'int64'
                },
                name: {
                    type: 'string'
                },
                tag: {
                    type: 'string',
                    format: 'uppercase'
                }
            }
        };

        data.tag = 'blah';
        assert.equal(swaggerUtil.validateJSONType(schema, data).valid, false);

        data.tag = 'BLAH';
        assert.equal(swaggerUtil.validateJSONType(schema, data).valid, true);
    });

});

describe('User model validation', function () {
    
    var specName = 'api-v1',
        myContact = {
            firstName: 'String',
            lastName: 'Cheese',
            email: 'string.cheese@mailinator.com'
        },
        brokenPolymorph = {
            email: 'foobar86@mailinator.com',
            kind: 'EnthusiasticPerson'
        };
    
    it('Validates an object against simple model', function () {
        assert.equal(swaggerService.validateObject(specName, 'Contact', myContact).valid, true);
    });
    
    it('Fails validation for a simple model with a wrong type', function () {
        var badContact = _.cloneDeep(myContact);
        badContact.gender = 7;
        var validationResult = swaggerService.validateObject(specName, 'Contact', badContact);
        assert.equal(validationResult.valid, false);
        assert.equal(validationResult.errors[0].schemaPath, '/properties/gender/type');
        assert.deepEqual(validationResult.errors[0].params, {
            expected: 'string',
            type: 'number'
        });
    });
    
    it('Fails validation for a simple model with a bad enum value', function () {
        var badContact = _.cloneDeep(myContact);
        badContact.gender = 'Robot';
        var validationResult = swaggerService.validateObject(specName, 'Contact', badContact);
        assert.equal(validationResult.valid, false);
        assert.equal(validationResult.errors[0].schemaPath, '/properties/gender/type');
        assert.deepEqual(validationResult.errors[0].message, 'No enum match for: "Robot"');
    });
    
    it('Fails validation for a simple model missing an object against simple model', function () {
        var validationResult = swaggerService.validateObject(specName, 'Person', myContact);
        assert.equal(validationResult.valid, false);
        assert.equal(validationResult.errors[0].code, 302);
        assert(validationResult.errors[0].message, 'Missing required property: kind');
    });
    
    it('Throws for an unknown specification', function () {
        assert.throws(function () {
            swaggerService.validateObject('foo-bar', 'Contact', myContact);
        }, /unknown specification/);
    });
    
    it('Throws for an unknown model', function () {
        assert.throws(function () {
            swaggerService.validateObject(specName, 'Missing', myContact);
        }, /unknown model/);
    });
    
    it('Fails validation when polymorphic contracts are broken', function () {
        var validationResult = swaggerService.validateObject(specName, 'Person', brokenPolymorph);
        assert.equal(validationResult.valid, false);
        assert.equal(validationResult.polymorphicValidationErrors[0].code, 302);
        assert(validationResult.polymorphicValidationErrors[0].message,
            'Missing required property: enthusiasticPersonReqField');
    });
    
    it('Passes validation when polymorphic contracts are broken but the check is disabled', function () {
        var validationResult = swaggerService.validateObject(specName, 'Person', brokenPolymorph, true);
        assert.equal(validationResult.valid, true);
    });
});

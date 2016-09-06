/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var _ = require('lodash'),
    assert = require('assert'),
    path = require('path'),
    config = require('../../testlib/mocks/config'),
    logger = require('../../testlib/mocks/logger'),
    swaggerService = require('../../services/swagger'),
    swaggerUtil = require('../../lib/swaggerUtil');

var swaggerExampleDir = path.resolve(__dirname, '../../examples/swagger'),
    swaggerExampleSpecs = 2;
var httpMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];

function initSwaggerService(rootDir, callback) {
    global.__appDir = rootDir;
    swaggerService.init(logger, config, callback);
}

describe('Swagger spec building test', function () {

    before(function (callback) {
        initSwaggerService(swaggerExampleDir, callback);
    });

    it('responses/requests with schema have map property', function () {
        _.forIn(swaggerService.getSimpleSpecs(), function (spec) {
            _.forIn(spec.paths, function (path) {
                _.forIn(path, function (method, methodKey) {
                    if (httpMethods.indexOf(methodKey) != -1) {
                        _.forIn(method.responses, function (response, key) {
                            if (response.schema) {
                                assert.ok(response.map, 'Simple specs ' + key + ' does not have a map property');
                                if (JSON.stringify(response.schema).includes('"discriminator":')){
                                    assert.ok(response.map.discriminator, 'Map for ' + key + ' does not have a discriminator property');
                                }
                            }
                        });
                        _.forIn(method.parameters, function (param, key) {
                            if (param.in === "body") {//schema required
                                assert.ok(param.schema, 'Simple specs ' + key + ' does not have a schema property');
                                assert.ok(param.map, 'Simple specs ' + key + ' does not have a map property');
                                if (JSON.stringify(param.schema).includes('"discriminator":')){
                                    assert.ok(JSON.stringify(param.map).includes('"discriminator":'), 'Map for ' + key + ' does not have a discriminator property');
                                }
                            }
                        });
                    }
                });
            });
        });
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

    before(function (callback) {
        initSwaggerService(swaggerExampleDir, callback);
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

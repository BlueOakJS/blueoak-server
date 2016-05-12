/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var _ = require('lodash'),
    assert = require('assert'),
    path = require('path'),
    config = require('../../testlib/mocks/config'),
    swaggerService = require('../../services/swagger'),
    swaggerUtil = require('../../lib/swaggerUtil');

var swaggerExampleDir = path.resolve(__dirname, '../../examples/swagger'),
    swaggerExampleSpecs = 2;

function initSwaggerService(rootDir, callback) {
    global.__appDir = rootDir;
    swaggerService.init(config, callback);
}

describe('Swagger spec building test', function () {

    before(function (callback) {
        initSwaggerService(swaggerExampleDir, callback);
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

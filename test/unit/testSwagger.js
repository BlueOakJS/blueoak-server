var assert = require("assert"),
    swaggerUtil = require('../../lib/swaggerUtil'),
    path = require('path');

var FAIL = 'failed';
var SUCCESS = 'success';

describe('String validation test', function () {

    it('Validate maxLength is honored', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            maxLength: 8
        }, '12345678').status, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            maxLength: 8
        }, '').status, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            maxLength: 0
        }, '1').status, FAIL);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            maxLength: 8
        }, '123456789').status, FAIL);
    });

    it('Validate minLength is honored', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            minLength: 8
        }, '12345678').status, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            minLength: 8
        }, '123456789').status, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            minLength: 8
        }, '1234567').status, FAIL);
    });

    it('Validate pattern is honored', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            pattern: '.*'
        }, 'sadfasdfs').status, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            pattern: '^[0-9]{1,3}$'
        }, '1').status, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            pattern: '^[0-9]{1,3}$'
        }, '1000').status, FAIL);
    });

});


describe('Number validation test', function () {

    it('Validate number', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'number'
        }, 4).status, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'number'
        }, "7").status, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'number'
        }, "foo").status, FAIL);
    });


    it('Validate multipleOf is honored', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            multipleOf: 2
        }, 4).status, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            multipleOf: 3
        }, 7).status, FAIL);
    });

    it('Validate maximum is honored', function () {

        //implicitly inclusive
        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            maximum: 2
        }, 2).status, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            maximum: 2,
            exclusiveMaximum: false
        }, 2).status, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            maximum: 20,
        }, 10).status, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            exclusiveMaximum: true,
            maximum: 2
        }, 2).status, FAIL);

    });

    it('Validate minimum is honored', function () {

        //implicitly inclusive
        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            minimum: 2
        }, 2).status, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            minimum: 2,
            exclusiveMinimum: false
        }, 2).status, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            minimum: 20,
        }, 30).status, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            exclusiveMinimum: true,
            minimum: 2
        }, 2).status, FAIL);

    });

});

describe('Boolean validation test', function () {

    it('Validate boolean', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'boolean'
        }, true).status, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'boolean'
        }, 'true').status, SUCCESS);
        
        assert.equal(swaggerUtil.validateParameterType({
            type: 'boolean'
        }, false).status, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'boolean'
        }, 'false').status, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'boolean'
        }, 'foo').status, FAIL);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'boolean'
        }, null).status, FAIL);
    });
});
var assert = require("assert"),
    swaggerUtil = require('../../lib/swaggerUtil'),
    path = require('path');

describe('String validation test', function () {

    it('Validate maxLength is honored', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            maxLength: 8
        }, '12345678').status, 'success');

        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            maxLength: 8
        }, '').status, 'success');

        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            maxLength: 0
        }, '1').status, 'failed');

        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            maxLength: 8
        }, '123456789').status, 'failed');
    });

    it('Validate minLength is honored', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            minLength: 8
        }, '12345678').status, 'success');

        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            minLength: 8
        }, '123456789').status, 'success');

        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            minLength: 8
        }, '1234567').status, 'failed');
    });

    it('Validate pattern is honored', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            pattern: '.*'
        }, 'sadfasdfs').status, 'success');

        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            pattern: '^[0-9]{1,3}$'
        }, '1').status, 'success');

        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            pattern: '^[0-9]{1,3}$'
        }, '1000').status, 'failed');
    });

});


describe('Number validation test', function () {

    it('Validate multipleOf is honored', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            multipleOf: 2
        }, 4).status, 'success');

        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            multipleOf: 3
        }, 7).status, 'failed');
    });

    it('Validate maximum is honored', function () {

        //implicitly inclusive
        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            maximum: 2
        }, 2).status, 'success');

        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            maximum: 2,
            exclusiveMaximum: false
        }, 2).status, 'success');

        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            maximum: 20,
        }, 10).status, 'success');

        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            exclusiveMaximum: true,
            maximum: 2
        }, 2).status, 'failed');

    });

    it('Validate minimum is honored', function () {

        //implicitly inclusive
        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            minimum: 2
        }, 2).status, 'success');

        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            minimum: 2,
            exclusiveMinimum: false
        }, 2).status, 'success');

        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            minimum: 20,
        }, 30).status, 'success');

        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            exclusiveMinimum: true,
            minimum: 2
        }, 2).status, 'failed');

    });

});
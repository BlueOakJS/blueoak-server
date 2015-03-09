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
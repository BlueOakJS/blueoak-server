/* Copyright © 2015 PointSource, LLC. All rights reserved. */
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

describe('Array validation test', function () {

    it('Validate maxItems is honored', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            },
            maxItems: 3
        }, '1,2,3').status, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            },
            maxItems: 2
        }, '1,2,3').status, FAIL);

    });

    it('Validate minItems is honored', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            },
            minItems: 3
        }, '1,2,3').status, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            },
            minItems: 4
        }, '1,2,3').status, FAIL);
    });

    it('Validate uniqueItems is honored', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            },
            uniqueItems: true
        }, '1,2,3').status, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            },
            uniqueItems: 'true'
        }, '1,2,3').status, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            },
            uniqueItems: false
        }, '1,2,3,3').status, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            },
            uniqueItems: true
        }, '1,2,3,3').status, FAIL);
    });

    it('Validate items is honored', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            }
        }, '1,2,3').status, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'string',
                maxLength: 4
            }
        }, '1234,1234').status, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'string',
                maxLength: 2
            },
            uniqueItems: true
        }, '123,123').status, FAIL);
    });

    it('Validate collectionFormat is honored', function () {

        //default csv
        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            },
            minItems: 2,
            maxItems: 2
        }, '1,2').status, SUCCESS);

        //explicit csv
        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            },
            collectionFormat: 'csv',
            minItems: 2,
            maxItems: 2
        }, '1,2').status, SUCCESS);

        //explicit ssv
        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            },
            collectionFormat: 'ssv',
            minItems: 2,
            maxItems: 2
        }, '1 2').status, SUCCESS);

        //explicit tsv
        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            },
            collectionFormat: 'tsv',
            minItems: 2,
            maxItems: 2
        }, '1\t2').status, SUCCESS);

        //explicit pipes
        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            },
            collectionFormat: 'pipes',
            minItems: 2,
            maxItems: 2
        }, '1|2').status, SUCCESS);

        //explicit multi
        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            },
            collectionFormat: 'multi',
            minItems: 2,
            maxItems: 2
        }, ['1','2']).status, SUCCESS);

        //explicit multi
        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            },
            collectionFormat: 'multi',
            minItems: 1,
            maxItems: 1
        }, '1').status, SUCCESS); //only one query param was used

    });
});

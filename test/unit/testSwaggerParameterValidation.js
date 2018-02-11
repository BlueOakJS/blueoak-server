/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var assert = require('assert'),
    swaggerUtil = require('../../lib/swaggerUtil');

var FAIL = false;
var SUCCESS = true;

describe('String validation test', function () {

    it('Validate maxLength is honored', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            maxLength: 8
        }, '12345678').valid, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            maxLength: 8
        }, '').valid, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            maxLength: 0
        }, '1').valid, FAIL);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            maxLength: 8
        }, '123456789').valid, FAIL);
    });

    it('Validate minLength is honored', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            minLength: 8
        }, '12345678').valid, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            minLength: 8
        }, '123456789').valid, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            minLength: 8
        }, '1234567').valid, FAIL);
    });

    it('Validate pattern is honored', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            pattern: '.*'
        }, 'sadfasdfs').valid, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            pattern: '^[0-9]{1,3}$'
        }, '1').valid, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            pattern: '^[0-9]{1,3}$'
        }, '1000').valid, FAIL);
    });

});


describe('Number validation test', function () {

    it('Validate number', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'number'
        }, 4).valid, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'number'
        }, '7').valid, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'number'
        }, 'foo').valid, FAIL);
    });


    it('Validate multipleOf is honored', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            multipleOf: 2
        }, 4).valid, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            multipleOf: 3
        }, 7).valid, FAIL);
    });

    it('Validate maximum is honored', function () {

        //implicitly inclusive
        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            maximum: 2
        }, 2).valid, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            maximum: 2,
            exclusiveMaximum: false
        }, 2).valid, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            maximum: 20,
        }, 10).valid, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            exclusiveMaximum: true,
            maximum: 2
        }, 2).valid, FAIL);

    });

    it('Validate minimum is honored', function () {

        //implicitly inclusive
        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            minimum: 2
        }, 2).valid, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            minimum: 2,
            exclusiveMinimum: false
        }, 2).valid, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            minimum: 20,
        }, 30).valid, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'number',
            exclusiveMinimum: true,
            minimum: 2
        }, 2).valid, FAIL);

    });

});

describe('Boolean validation test', function () {

    it('Validate boolean', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'boolean'
        }, true).valid, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'boolean'
        }, 'true').valid, SUCCESS);
        
        assert.equal(swaggerUtil.validateParameterType({
            type: 'boolean'
        }, false).valid, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'boolean'
        }, 'false').valid, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'boolean'
        }, 'foo').valid, FAIL);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'boolean'
        }, null).valid, FAIL);
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
        }, '1,2,3').valid, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            },
            maxItems: 2
        }, '1,2,3').valid, FAIL);

    });

    it('Validate minItems is honored', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            },
            minItems: 3
        }, '1,2,3').valid, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            },
            minItems: 4
        }, '1,2,3').valid, FAIL);
    });

    it('Validate uniqueItems is honored', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            },
            uniqueItems: true
        }, '1,2,3').valid, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            },
            uniqueItems: 'true'
        }, '1,2,3').valid, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            },
            uniqueItems: false
        }, '1,2,3,3').valid, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            },
            uniqueItems: true
        }, '1,2,3,3').valid, FAIL);
    });

    it('Validate items is honored', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            }
        }, '1,2,3').valid, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'string',
                maxLength: 4
            }
        }, '1234,1234').valid, SUCCESS);

        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'string',
                maxLength: 2
            },
            uniqueItems: true
        }, '123,123').valid, FAIL);
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
        }, '1,2').valid, SUCCESS);

        //explicit csv
        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            },
            collectionFormat: 'csv',
            minItems: 2,
            maxItems: 2
        }, '1,2').valid, SUCCESS);

        //explicit ssv
        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            },
            collectionFormat: 'ssv',
            minItems: 2,
            maxItems: 2
        }, '1 2').valid, SUCCESS);

        //explicit tsv
        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            },
            collectionFormat: 'tsv',
            minItems: 2,
            maxItems: 2
        }, '1\t2').valid, SUCCESS);

        //explicit pipes
        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            },
            collectionFormat: 'pipes',
            minItems: 2,
            maxItems: 2
        }, '1|2').valid, SUCCESS);

        //explicit multi
        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            },
            collectionFormat: 'multi',
            minItems: 2,
            maxItems: 2
        }, ['1','2']).valid, SUCCESS);

        //explicit multi
        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'number'
            },
            collectionFormat: 'multi',
            minItems: 1,
            maxItems: 1
        }, '1').valid, SUCCESS); //only one query param was used

    });
});

describe('Test array validation - issue #55', function () {
    
    it('Validate array parameter when array is given', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'string',
                enum: [ 'ANY', 'Type_A', 'Type_R', 'Type_S']
            },
            collectionFormat: 'csv',
            default: ['ANY']
        }, ['ANY', 'Type_A']).valid, SUCCESS);
    });
    
    it('Validate array parameter when string is given', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'array',
            items: {
                type: 'string',
                enum: [ 'ANY', 'Type_A', 'Type_R', 'Type_S']
            },
            collectionFormat: 'csv',
            default: ['ANY']
        }, 'ANY,Type_A').valid, SUCCESS);
    });


});

describe('Test additional formats', function () {

    it('Invalid date-time fails', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            format: 'date-time'
        }, '12345678').valid, FAIL);
    });

    it('Valid date-time passes', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            format: 'date-time'
        }, '2014-05-02T12:59:29+00:00').valid, SUCCESS);
    });
    
    it('Invalid date fails', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            format: 'date'
        }, '12345678').valid, FAIL);
    });

    it('Valid date passes', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            format: 'date'
        }, '2014-05-20').valid, SUCCESS);
    });
    
    it('Validate password format passes', function () {
        assert.equal(swaggerUtil.validateParameterType({
            type: 'string',
            format: 'password'
        }, 'passw0rd').valid, SUCCESS);
    });

});
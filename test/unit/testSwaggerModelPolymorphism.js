/*
 * Copyright (c) 2018 Globant
 * MIT Licensed
 */
var assert = require('assert'),
    swaggerUtil = require('../../lib/swaggerUtil');

describe('Test handling invalid OAI array definitions while preparing polymorphic validation', function () {
    
    var incompleteArrayDefinition = {
        type: 'array'
    };
    var incompleteArrayDefinitionInBiggerThing = {
        type: 'object',
        properties: {
            'TheIncompletelyDefinedArray': {
                type: 'array'
            }
        }
    };
   
    it('Throws an error if an array definition is missing "items"', function () {
        assert.throws(
            function () {
                swaggerUtil.getObjectsWithDiscriminator(incompleteArrayDefinition);
            },
            /Error: OpenAPI array definitions require an "items" property/);
    });
   
    it('Throws an error with a model path if sub property is an array with missing "items"', function () {
        assert.throws(
            function () {
                swaggerUtil.getObjectsWithDiscriminator(incompleteArrayDefinitionInBiggerThing);
            },
            /Error: OpenAPI array definitions require an "items" property; at model path: TheIncompletelyDefinedArray/);
    });
   
    it('Throws an error with the top full model path if sub property is an array with missing "items"', function () {
        assert.throws(
            function () {
                swaggerUtil.getObjectsWithDiscriminator(incompleteArrayDefinitionInBiggerThing, 'MyModel');
            },
            /Error: OpenAPI array .+ at model path: MyModel.TheIncompletelyDefinedArray/);
    });
    
});

// TODO: add more testing of swaggerUtil.getObjectsWithDiscriminator

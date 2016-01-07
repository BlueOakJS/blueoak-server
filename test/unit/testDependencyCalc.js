/* Copyright © 2015 PointSource, LLC. All rights reserved. */
var assert = require('assert'),
    depCalc = require('../../lib/dependencyCalc');

describe('Dependency Calculator', function () {

    it('should return empty array when no dependencies', function () {
        var result = depCalc.calcGroups();
        assert.equal(result.length, 0, 'result is an empty array');
    });

    it('should correctly calculate the dependency groups', function () {
        depCalc.addNode('a');
        depCalc.addNode('c', ['a']);
        depCalc.addNode('d', ['a']);
        depCalc.addNode('e', ['c', 'd']);
        depCalc.addNode('f', ['d']);

        var results = depCalc.calcGroups();
        assert.equal(results.length, 3);

        //a
        assert.equal(results[0].length, 1);
        assert.equal(results[0][0], 'a');

        //c & d
        assert.equal(results[1].length, 2);
        assert(results[1].indexOf('c') > -1);
        assert(results[1].indexOf('d') > -1);

        //e & f
        assert.equal(results[2].length, 2);
        assert(results[2].indexOf('e') > -1);
        assert(results[2].indexOf('f') > -1);
    });

    it('should throw an error for circular dependencies', function () {
        depCalc.addNode('a', ['b']);
        depCalc.addNode('b', ['c']);
        depCalc.addNode('c', ['d']);
        depCalc.addNode('d', ['e']);
        depCalc.addNode('e', ['a']);
        assert.throws(function () {
            depCalc.calcGroups();
        }, /Cycle.found/);
    });

    it('should throw an error for unmet dependencies', function () {
        depCalc.addNode('a', ['d']);
        assert.throws(function () {
            depCalc.calcGroups();
        }, /Unmet.dependency/);

    });

    it('should reset itself after a calc', function () {
        depCalc.addNode('a', ['d']);

        //First do a circular dep calc
        assert.throws(function () {
            depCalc.calcGroups();
        });

        //Should be empty after the failure, so another calcGroups will return an empty list
        assert.equal(depCalc.calcGroups().length, 0);

        //Then let's do a non-failing one
        depCalc.addNode('a', []);
        assert.equal(depCalc.calcGroups().length, 1);

        //And do it again
        assert.equal(depCalc.calcGroups().length, 0);
    });

});

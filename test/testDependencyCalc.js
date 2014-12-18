module.exports = {


    setUp: function (callback) {
        this.depCalc = require('../lib/dependencyCalc');
        callback();
    },

    tearDown: function (callback) {
        this.depCalc = null;
        callback();
    },

    testEmpty: function (test) {
        test.expect(1);
        var result = this.depCalc.calcGroups();
        test.equals(result.length, 0, 'result is an empty array');
        test.done();
    },

    testGroups: function (test) {
        test.expect(9);
        this.depCalc.addNode('a')
        this.depCalc.addNode('c', ['a']);
        this.depCalc.addNode('d', ['a']);
        this.depCalc.addNode('e', ['c', 'd']);
        this.depCalc.addNode('f', ['d']);
        var results = this.depCalc.calcGroups();
        //console.log(results.length)
        test.equals(results.length, 3);

        //a
        test.equals(results[0].length, 1);
        test.equals(results[0][0], 'a');

        //c & d
        test.equals(results[1].length, 2);
        test.ok(results[1].indexOf('c') > -1);
        test.ok(results[1].indexOf('d') > -1);

        //e & f
        test.equals(results[2].length, 2);
        test.ok(results[2].indexOf('e') > -1);
        test.ok(results[2].indexOf('f') > -1);
        test.done();
    },

    testCircular: function (test) {
        test.expect(1);
        this.depCalc.addNode('a', ['d'])
        this.depCalc.addNode('b', ['a']);
        this.depCalc.addNode('c', ['d']);
        this.depCalc.addNode('d', ['a', 'e']);
        this.depCalc.addNode('e');
        var cycleFound = false;
        try {
            var results = this.depCalc.calcGroups();
        } catch (err) {
            cycleFound = true;
        }
        //console.log(results.length)
        test.equals(cycleFound, true, 'Cycle error occurred');

        test.done();
    }

};
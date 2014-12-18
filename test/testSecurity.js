module.exports = {

    setUp: function (callback) {
        this.security = require('../lib/security');
        callback();
    },

    tearDown: function (callback) {
        this.security = null;
        callback();
    },

    testDecrypt: function (test) {

        //These were created using the bin/encrypt.js tool
        var data = [
            ['{bf}f2556cbd22a264f8a641d835bdaf5f8f=', 'key1', 'testdata1'],
            ['{aes-256-cbc}0f785ad2e71122e2f1bfe6914a01ab56=', 'key2', 'testdata2'],
        ];

        test.expect(data.length);
        for (var i = 0; i < data.length; i++) {
            var text = data[i][0];
            var key = data[i][1];
            var result = data[i][2];
            test.equals(this.security.decrypt(text, key), result);
        }
        test.done();

    },

    testInvalidCipher: function (test) {
        test.expect(1);
        try {
            var result = this.security.decrypt('{foo}f2556cbd22a264f8a641d835bdaf5f8f=', 'key1');
        } catch (err) {
            test.ok(true, 'Expected an error');
        }

        test.done();
    },

    testInvalidText: function (test) {
        test.expect(1);
        try {
            var result = this.security.decrypt('{bf}X2556cbd22a264f8a641d835bdaf5f8f=', 'key1');
        } catch (err) {
            test.ok(true, 'Expected an error');
        }

        test.done();
    },

    testInvalidDecryptFormat: function(test) {
        test.expect(1);
        try {
            var result = this.security.decrypt('INVALIDDATA', 'key1');
        } catch (err) {
            test.ok(err.message.indexOf('Invalid') > -1, 'Expected an error');
        }

        test.done();
    },

    testEmptyCipher: function(test) {
        test.expect(1);
        try {
            var result = this.security.decrypt('{}X2556cbd22a264f8a641d835bdaf5f8f=', 'key1');
        } catch (err) {
            test.ok(err.message.indexOf('Invalid') > -1, 'Expected an error');
        }

        test.done();
    }

};
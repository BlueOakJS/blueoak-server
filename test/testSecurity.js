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
            ['{aes-256-cbc}0f785ad2e71122e2f1bfe6914a01ab56=', 'key2', 'testdata2']
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
    },

    //Iterate through some data contain encrypted values and make sure we can detect that
    testContainsEncryptedData: function(test) {
        var encryptedData = '{test}data=';

        var toTest = [
            //Simple
            {
                data: encryptedData
            },

            //Nested
            {
                data: {
                    data: {
                        data: encryptedData
                    }
                }
            },

            //Array
            {
                data: [encryptedData]
            },

            //Nested Array
            {
                data: [{
                    data: [{

                    }, {
                        data: encryptedData
                    }]
                }]
            }
        ];

        test.expect(toTest.length);
        for (var i = 0; i < toTest.length; i++) {
            test.ok(this.security.containsEncryptedData(toTest[i]), "Should contain encrypted data");
        }

        test.done();
    },

    //Iterate through some data without any encrypted values and make sure we don't get any false positives.
    testNotContainsEncryptedData: function(test) {
        var unencryptedData = 'data';

        var toTest = [
            //Simple
            {
                data: unencryptedData
            },

            //Nested
            {
                data: {
                    data: {
                        data: unencryptedData
                    }
                }
            },

            //Array
            {
                data: [unencryptedData]
            },

            //Nested Array
            {
                data: [{
                    data: [{

                    }, {
                        data: unencryptedData
                    }]
                }]
            }
        ];

        test.expect(toTest.length);
        for (var i = 0; i < toTest.length; i++) {
            test.ok(!this.security.containsEncryptedData(toTest[i]), "Should NOT contain encrypted data");
        }

        test.done();
    },

    //Test that we can decrypt all the encrypted values in a JSON object
    testDecryptObject: function(test) {
        var encryptedData = '{bf}f2556cbd22a264f8a641d835bdaf5f8f=';
        var key = 'key1';
        var value = 'testdata1';

        test.expect(4);

        var security = this.security;
        var decryptFunc = function(str) {
            return security.decrypt(str, key);
        };

        //Simple object
        var obj = {
            data: encryptedData
        };
        this.security.decryptObject(obj, decryptFunc);
        test.equals(obj.data, value);


        //Nested object
        obj = {
            data: {
                data: {
                    data: encryptedData
                }
            }
        };
        this.security.decryptObject(obj, decryptFunc);
        test.equals(obj.data.data.data, value);


        //Simple Array
        obj = {
            data: [encryptedData]
        };
        this.security.decryptObject(obj, decryptFunc);
        test.equals(obj.data[0], value);


        //Nested Array
        obj = {
            data: [{
                data: [{

                }, {
                    data: encryptedData
                }]
            }]
        };
        this.security.decryptObject(obj, decryptFunc);
        test.equals(obj.data[0].data[1].data, value);

        test.done();
    }

};
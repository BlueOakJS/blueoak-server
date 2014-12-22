var assert = require("assert"),
    security = require('../lib/security');

describe('Security Decryption', function () {

    it('should decrypt strings with expected results', function () {
        //These were created using the bin/encrypt.js tool
        var data = [
            ['{bf}f2556cbd22a264f8a641d835bdaf5f8f=', 'key1', 'testdata1'],
            ['{aes-256-cbc}0f785ad2e71122e2f1bfe6914a01ab56=', 'key2', 'testdata2']
        ];

        for (var i = 0; i < data.length; i++) {
            var text = data[i][0];
            var key = data[i][1];
            var result = data[i][2];
            assert.equal(security.decrypt(text, key), result);
        }
    });

    it('should throw an error when the cipher is invalid', function () {
        assert.throws(function () {
            security.decrypt('{foo}f2556cbd22a264f8a641d835bdaf5f8f=', 'key1');
        });
    });

    it('should throw an error when the encrypted text is invalid', function () {
        assert.throws(function () {
            security.decrypt('{bf}X2556cbd22a264f8a641d835bdaf5f8f=', 'key1');
        });
    });

    it('should throw an error when the string is in an invalid format', function () {
        assert.throws(function () {
            security.decrypt('INVALIDDATA', 'key1');
        }, /Invalid/);
    });

    it('should throw an error when the cipher is empty', function () {
        assert.throws(function () {
            security.decrypt('{}X2556cbd22a264f8a641d835bdaf5f8f=', 'key1');
        }, /Invalid/);
    });

});


describe('Security Config', function () {

    it('should identify json data containing encrypted text.', function () {
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
                    data: [{}, {
                        data: encryptedData
                    }]
                }]
            }
        ];

        for (var i = 0; i < toTest.length; i++) {
            assert(security.containsEncryptedData(toTest[i]), "Should contain encrypted data");
        }

    });

    it('should identify json data NOT containing encrypted text.', function () {
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
                    data: [{}, {
                        data: unencryptedData
                    }]
                }]
            }
        ];

        for (var i = 0; i < toTest.length; i++) {
            assert(!security.containsEncryptedData(toTest[i]), "Should NOT contain encrypted data");
        }
    });

    it('should decrypt all the encrypted text in the config', function () {
        var encryptedData = '{bf}f2556cbd22a264f8a641d835bdaf5f8f=';
        var key = 'key1';
        var value = 'testdata1';


        var decryptFunc = function (str) {
            return security.decrypt(str, key);
        };

        //Simple object
        var obj = {
            data: encryptedData
        };

        security.decryptObject(obj, decryptFunc);
        assert.equal(obj.data, value);


        //Nested object
        obj = {
            data: {
                data: {
                    data: encryptedData
                }
            }
        };
        security.decryptObject(obj, decryptFunc);
        assert.equal(obj.data.data.data, value);


        //Simple Array
        obj = {
            data: [encryptedData]
        };
        security.decryptObject(obj, decryptFunc);
        assert.equal(obj.data[0], value);


        //Nested Array
        obj = {
            data: [{
                data: [{}, {
                    data: encryptedData
                }]
            }]
        };
        security.decryptObject(obj, decryptFunc);
        assert.equal(obj.data[0].data[1].data, value);

    });

});

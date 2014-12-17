exports.metadata = {
    id: "security",
    description: "Security service",
    dependencies: [],
    bootstrap: true
}

var cluster = require('cluster'),
    crypto = require('crypto');

//Encrypt a text string

function encrypt(text) {
    var cipher = crypto.createCipher('aes-256-cbc', 'testkey');
    var crypted = cipher.update(text, 'utf8', 'hex');
    crypted += cipher.final('hex');
    return crypted;
}


//Decrypt a text string

/**
 *
 * @param text data to decode
 * @param encoding encoding used, e.g. 'aes-256-cbc'
 * @param key the decryption key
 * @returns {*}
 */
function decipher(text, encoding, key) {
    var decipher = crypto.createDecipher(encoding, key);
    var dec = decipher.update(text, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
}

exports.decrypt = function(text, key) {
    var pattern = /{(.*)}(.*)=/;
    var match = pattern.exec(text);
    var encoding = match[1];
    var data = match[2];
    return decipher(data, encoding, key);
}


exports.init = function(server, callback) {
    callback();
}

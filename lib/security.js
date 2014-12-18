var crypto = require('crypto');

/**
 * Decrypts a text string from the config
 * @param text a string of the format {<cipher>}text=
 * @param key the key to decrypt the text
 * @returns a string
 */
module.exports.decrypt = function(text, key) {
    var pattern = /{(\w+)}(.*)=/;
    var match = pattern.exec(text);

    //match is null if it doesn't match the pattern
    if (match === null) {
        throw new Error('Invalid string: must be in the form {<cipher>}text=');
    }

    var encoding = match[1];
    var data = match[2];
    var decipher = crypto.createDecipher(encoding, key);
    var dec = decipher.update(data, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
}

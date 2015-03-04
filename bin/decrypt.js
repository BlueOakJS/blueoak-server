#!/usr/bin/env node

var security = require('../lib/security')


if (process.argv.length === 4) {
    try {
        console.log(decrypt(process.argv[3], process.argv[2]));
    } catch (err) {
        console.warn(err.message);
    }
} else {
    printHelp();
}

function printHelp() {
    console.log('Decodes text from the sprout-server config files.');
    console.log('Usage: decrypt.js <key> <encodedText>\n');
    console.log('Encoded text should be of the form {<cipher>}text=');
}

function decrypt(text, key) {
    return security.decrypt(text, key);
}

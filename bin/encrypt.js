#!/usr/bin/env node

/* Copyright © 2015 PointSource, LLC. All rights reserved. */
var crypto = require('crypto');
var defaultCipher = 'aes-256-cbc';



if (process.argv.length === 4 && process.argv[2] !== '-c') {
    //use default cipher
    console.log(encrypt(process.argv[3], process.argv[2], defaultCipher));
} else if (process.argv.length === 6 && process.argv[2] === '-c') {
    try {
        console.log(encrypt(process.argv[5], process.argv[4], process.argv[3]));
    } catch (err) {
        console.warn('Error');
    }
} else {
    printHelp();
}

function printHelp() {
    console.log('Encodes text for use in the blueoak-server config files.');
    console.log('Usage: encrypt.js [options] key text\n');
    console.log('Options:');
    console.log('\t-c <cipher>\tCipher to use\n');
    console.log('Available ciphers:');

    var ciphers = crypto.getCiphers();

    for (var i = 0; i < ciphers.length; i+=4 ) {
        console.log('  ' + pad(ciphers[i]) + pad(ciphers[i + 1]) + pad(ciphers[i + 2]) + pad(ciphers[i + 3]) );
    }
    console.log('* denotes default cipher');
}

function pad(str) {
    if (!str) {
        return '';
    }
    if (str === defaultCipher) {
        str = '*' + str + '*';
    }
    while (str.length < 23) {
        str = str + ' ';
    }
    return str;
}

function encrypt(text, key, cipherType) {
    var cipher = crypto.createCipher(cipherType, key);
    var crypted = cipher.update(text, 'utf8', 'hex');
    crypted += cipher.final('hex');
    return '{' + cipherType + '}' + crypted + '=';
}

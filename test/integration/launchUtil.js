/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var path = require('path'),
    child_process = require('child_process');

var lastLaunch = null;

exports.launch = function (fixtureName, opts, done) {

    //opts is optional
    if (!done) {
        done = opts;
        opts = {};
    }
    if (!opts.exec) {
        opts.exec = '../../bin/blueoak-server.js';
    }

    var output = '';
    var bosPath = path.resolve(__dirname, opts.exec);
    if (process.platform === 'win32') {
        lastLaunch = child_process.exec('node ' + bosPath,
            {
                'cwd': path.resolve(__dirname, 'fixtures/' + fixtureName),
                'env': opts.env
            },
            function (err, stdout, stderr) {
                if (err) {
                    console.warn(err, stderr);
                }
                output += stdout + stderr;
            });
    }
    else {
        lastLaunch = child_process.execFile(bosPath, [],
            {
                'cwd': path.resolve(__dirname, 'fixtures/' + fixtureName),
                'env': opts.env
            },
            function (err, stdout, stderr) {
                if (err) {
                    console.warn(err, stderr);
                }
                output += stdout + stderr;
            });
    }
    setTimeout(function () {
        output = output.length > 50 ? output : null; //if output > 50, probably contains a stack tracegu
        done(output);
    }, 4000);
};

exports.finish = function (done) {
    if (process.platform === 'win32') {
        child_process.exec('taskkill /PID ' + lastLaunch.pid + ' /T /F');
    }
    else {
        lastLaunch.kill('SIGINT');
    }
    setTimeout(function () {
        done();
    }, 2500);
};


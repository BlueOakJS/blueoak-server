/*
 * Copyright (c) 2015-2016 PointSource, LLC.
 * MIT Licensed
 */
var path = require('path'),
    child_process = require('child_process');

var lastLaunch, output;

var spawner, execer;
if (process.platform === 'win32') {
    spawner = child_process.exec;
    execer = 'node ';
} else {
    spawner = child_process.execFile;
    execer = '';
}

exports.launch = function (fixtureName, opts, done) {

    //opts is optional
    if (!done) {
        done = opts;
        opts = {};
    }
    if (!opts.exec) {
        opts.exec = '../../bin/blueoak-server.js';
    }

    var bosPath = path.resolve(__dirname, opts.exec);
    output = '';
    lastLaunch = spawner(execer + bosPath,
        {
            'cwd': path.resolve(__dirname, 'fixtures/' + fixtureName),
            'env': opts.env
        },
        function (err, stdout, stderr) {
            if (err && err.signal !== 'SIGINT') {
                console.warn(JSON.stringify(err, 0, 2), '\n' + stderr);
            }
            output += stdout + stderr;
        }
    );
    setTimeout(function () {
        // stack traces usually start with 'Error:', if there's that pattern, return it
        output = /^Error:*/m.test(output) ? output : null;
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

    if (output) {
        // there was an "error" on launch, just be done
        done();
    } else {
        lastLaunch.on('close', function (code, signal) {
            done();
        });
    }
};


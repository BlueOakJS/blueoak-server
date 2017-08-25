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

    var args = [];
    args = args.concat(opts.mockServices ? ['--mock-services', opts.mockServices] : []);
    args = args.concat(opts.mockMiddleware ? ['--mock-middleware', opts.mockMiddleware] : []);

    var bosPath = path.resolve(__dirname, opts.exec);
    output = '';
    lastLaunch = spawner(execer + bosPath, args,
        {
            'cwd': path.resolve(__dirname, 'fixtures/' + fixtureName),
            'env': opts.env
        },
        function (err, stdout, stderr) {
            if (err && err.signal !== 'SIGINT') {
                console.warn(JSON.stringify(err, 0, 2), '\n' + stderr);
            }
        }
    );

    // capture output as it occurs
    lastLaunch.stdout.on('data', function (data) {output += data;});
    lastLaunch.stderr.on('data', function (data) {output += data;});

    setTimeout(function () {
        // default level to ERROR
        var level = (opts.outputLevel || 'error').toLowerCase();

        // filter output that doesn't match the log level (case-insensitive, multiline)
        var regex = new RegExp('^' + level + ':*', 'im');
        output = regex.test(output) ? output : null;
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

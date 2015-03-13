var path = require('path'),
    child_process = require('child_process');

var lastLaunch = null;

exports.launch = function(fixtureName, done) {
    lastLaunch = child_process.execFile(path.resolve(__dirname, '../../bin/sprout-server.js'), [],
        {'cwd': path.resolve(__dirname, 'fixtures/' + fixtureName)},
        function(err, stdout, stderr) {
            if (err) {
                console.warn(err, stderr);
            }
        });
    setTimeout(function() {
        done();
    }, 1000);
};

exports.finish = function(done) {
    lastLaunch.kill('SIGINT');
    setTimeout(function() {
        done();
    }, 1000);
};

var testServer = require('../launchUtil'),
    readline = require('readline');

var fixtureName;
if (process.argv.length < 3) {
    console.log('Provide the name of the fixture to start as an argument.');
    console.log('e.g.:', process.argv[0], process.argv[1], 'server1');
    process.exit(3);
} else {
    fixtureName = process.argv[2];
}
    
testServer.launch(fixtureName, function (err, child) {
    console.log(err || 'started ' + fixtureName);
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    rl.question('Type anything to quit: ', function (answer) {
        rl.close();
        testServer.finish(function () {
            console.log('ended');
            process.exit(0);
        });
    });
});



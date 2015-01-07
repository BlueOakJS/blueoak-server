exports.metadata = {
    description: "Echo's text to the console",
    dependencies: ['config', 'logger', 'middleware']
};

exports.init = function(server, cfg, callback) {
    callback();
}

exports.echo = function(txt) {
    console.log(txt);
}
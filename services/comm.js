var cluster = require('cluster');
var subscriptions = {};

exports.init =  function(logger) {

};

exports.broadcast = function(event, payload) {
    if (cluster.isMaster) {
        var callback = subscriptions[event];
        if (callback) {
            process.nextTick(function() {
                callback(payload);
            });
        }
    } else {
        process.send({cmd: 'broadcast', event: event, payload: payload});
    }
};

//used internally to call the on(event) function
exports._processBroadcast =  function(data) {
    var event = data.event;
    var callback = subscriptions[event];
    if (callback) {
        process.nextTick(function() {
            callback(data.payload);
        });
    }
};

exports.on = function(event, callback) {
    subscriptions[event] = callback;
};

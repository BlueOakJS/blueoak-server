
services = {};

module.exports.add = function(module) {
    services[module.metadata.id] = module;
}

module.exports.get = function(serviceId) {
    return services[serviceId];
}
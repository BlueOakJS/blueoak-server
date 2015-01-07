# Services

Services are special modules used to provide additional functionality to the server.
They're the building blocks of most of the capabilities of the server, such as logging and configuration.

## Anatomy of a Service

At a minimum, services are modules that contain an `init` method.
They can additionally contain metadata describing the service.

```js

exports.metadata = {
    id: "MyService",
    description: "Does something",
    dependencies: ['config', 'logger']
}

exports.init = function(server, cfg, callback) {
    server.get('logger').info('initializing my service');
    callback();
}

exports.doSomething = function() {
    ...
}

```

### Metadata
Additional metadata can be exported through the *metadata* field.
The *id* is used elsewhere to look up and reference the service.
If not provided, the id defaults to the file name (minus the .js extension).

If the service depends on any other services during startup, they should be listed in the dependencies field.
The server will guarantee that the service won't be initialized until the dependent services are initialized.

### initialization

The module must contain an init method which is called during startup to initialize the service.
The method has three parameters:

* server - The ps-nas server.  Can be used to look up services are call any other methods belonging to the ps-nas API.
* cfg - This is the block of the config for this service.  The service id must match the field in the config.
* callback - a callback function that must be called once initialization is complete.

If an unrecoverable error occurs during initialization, the error can be passed to the callback to halt server startup.

The *cfg* parameter is a short-cut for having to explicitly look up the config through the config service using `server.get('config').get(<serviceName>)`.

After initialization, the service can be acquired through the `get(...)` method on the server.

```js
  var myService = server.get('MyService');
  myService.doSomething();
```

## Custom services
Any service module can be played in the *services* directory of the application and will be automatically loaded.

## Third-party services
A third-party service is a service whose code lives outside of the application or ps-nas.
The service most live somewhere in the node_modules (preferably included in the application's package.json and installed with npm).
Add the package name to the *services* list in the config to include it.

```json
{
  "services": ["service1", "service2"]
}
```

The order doesn't matter since the dependency lists will still be used at startup to calculate the order.
During startup the third-party service will be loaded through a normal `require(...)` call.

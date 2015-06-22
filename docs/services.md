# Services

Services are special modules used to provide additional functionality to the server.
They're the building blocks of most of the capabilities of the server, such as logging and configuration.

## Anatomy of a Service

At a minimum, services are modules that contain an `init` method.

```js
exports.init = function(logger, callback) {
    logger.info('initializing my service');
    callback();
}

exports.doSomething = function() {
    ...
}

```

### initialization

The module must contain an init method which is called during startup to initialize the service.

Dependency injection is used to allow a service to reference other services from within *init*.
The names of the parameters in the init method must match the module names of other services.
The init method won't be called until all other dependent services are initialized.

Additionally a parameter called *callback* can be passed as the last argument of init.
If specified, init will be called asynchronously.  Any errors that occur during the init can be passed as a parameter to the callback.

If the callback parameter is omitted, init will be a blocking call, meaning any subsequent services won't init until this one completes.

After initialization, other services can reference the service through dependency injection and call any methods on that service.

```js

    exports.init = function(myService, callback) {
        myService.doSomething();
        callback();
    }

```

## Custom services
Any service module can be played in the *services* directory of the application and will be automatically loaded.

## Third-party services
A third-party service is a service whose code lives outside of the application or sprout-server.
The service most live somewhere in the node_modules (preferably included in the application's package.json and installed with npm).
During startup the third-party service will be loaded through a normal `require(...)` call.

## Accessing services inside of modules
Suppose you have an ordinary module that's loaded via `require`, and you need to be able to access a service like the logger.
You won't be able to use the same dependency-injection mechanism used in services and handlers containing and `init` method.

Instead you can use the global `services` object to get the logger.

```js
    var logger = services.get('logger');
```

However, this can be tricky because a required module will likely be loaded before all the services have initialized.
To better handle that case, a callback can be specified to make the call asynchronous.
The callback won't be called until after the specified module has been initialized.

```js
    services.get('logger', function(logger) {
        logger.info('It worked!');
    });
```

ps-nas
======

PointSource Node App Server reference implementation.

This is a prescribed framework for building NodeJS-based middleware.

### Features
    * Based on expressjs
    * Supports clustering out of the box
    * Service framework
    * Built in config and logging

### Installation

```bash
$ npm install ps-nas
```

### Usage
```js
var server = require('ps-nas');

server.init(function(err) {
    if (err) {
        console.warn(err);
    } else {
        console.log('started');
    }
});
```

# Services

Services are modules that at a minimum contain an `init` method and some metadata describing the service.  They can be placed in the *services* directory of your project and will be automatically loaded.

The metadata should contain an *id*.  The optional *dependencies* field is an array of ids of other services that are needed.  The server will guarantee that a service won't be init'd until the dependent servers are init'd.

```js

exports.metadata = {
    id: "MyService",
    description: "Does something",
    dependencies: ['config', 'logger']
}

exports.init = function(server, callback) {
  var config = server.config.get('myService');
  server.logger.info('initializing my service');
}

exports.doSomething = function() {
  server.logger.info('Do something');
}

```

After initialization, the service is placed directly in the server object.
```js
  var myService = server.MyService;
  myService.doSomething();
```

## Built-in Services

### Config
The config service is based off of the [node-config](https://github.com/lorenwest/node-config) project.  It supports a hierarchy of config files.

At a minimum your server should have a *config* directory containing *defaults.json*.

To access the config data, use the `config.get(...)` method.

```json
{
  "myConfig": {
    "foo": "bar"
  }
}
```

```js
var fooValue = server.config.get('myConfig').foo; //fooValue === "bar"
```

### Logger
The logging service is a basic logger that logs to stdout.  By default it supports levels of debug, info, warn, and error.

```js
  var logger = server.logger;
  logger.debug('debug message');
  logger.info('info message');
  logger.warn('warn message');
  logger.error('error message');
```
Additional log levels can be specified in the logger config.  The levels will be lowercased when registered.  The example below will create a `logger.foo(...)` method on the logger.

```json
{
  "logging": {
    "levels": ["FOO"]
  }
}
```
The logger will prepend the log messages with the log level, timestamp, and PID.

### Security
The security service is used to securely store config values in the server.
If the config contains an encrypted value, the server will prompt for a password during startup.

The format for encrypted values is `{cipher}value=`, e.g. `{aes-256-cbc}cf3d490f602b718d5694e2ca1a231d08=`

### Generating Encrypted Config
A tool is provided, ps-nas/bin/encrypt.js, for encrypting values.

Typical usage is `encrypt.js -c <cipher> <key> <data>`.  The default cipher is aes-256-cbc.

### Bypassing prompt
The key can either be specified as an environment variable, `decryptionKey`, or included in the security section of the config file.
**Storing the key in the config isn't secure and is only suggested for avoiding sensitive data in plain text**.

```json
{
  "security": {
    "key": "myKey" //When set, don't prompt during startup for password
  }
}
```

## Clustering
Clustering is supported out of the box.  The number of workers can be configured.  A value of 1 is recommended during development.

```json
{
  "cluster": {
    "maxWorkers": 1
  }
}
```

If *maxWorkers* is not specified or a negative value, the number of workers will be set to the number of cpus/cores on the system.

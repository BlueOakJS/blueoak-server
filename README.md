ps-nas
======

PointSource Node App Server reference implementation.

This is a prescribed framework for building NodeJS-based middleware.

### Features
    * Based on expressjs
    * Supports clustering out of the box
    * Service framework
    * Config and logging services
    * Encrypted config values

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

Services are the building blocks of most of the functionality in the server.
At a minimum, services are modules that contain an `init` method and some metadata describing the service.  They can be placed in the *services* directory of your project and will be automatically loaded.

The metadata should contain an *id*.  The optional *dependencies* field is an array of ids of other services that are needed.  The server will guarantee that a service won't be init'd until the dependent servers are init'd.

```js

exports.metadata = {
    id: "MyService",
    description: "Does something",
    dependencies: ['config', 'logger']
}

exports.init = function(server, cfg, callback) {
  server.logger.info('initializing my service');
}

exports.doSomething = function() {
  server.logger.info('Do something');
}

```

The *cfg* parameter is the config for that service.  This is a short-cut for having to explicitly look up the config through the config service using `server.config.get(<serviceName>)`.
More details are described in the config service section.

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

#### Service config
Each service can have its own section of data in the config keyed off of the service ID.
This block of data will be passed to the service's init method during initialization.

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

#### Securing Config Files
The config can contain encrypted strings.  If an encrypted string is found in the value of an array or object,
the server will prompt for a password during startup.

The format for encrypted values is `{cipher}value=`, e.g. `{aes-256-cbc}cf3d490f602b718d5694e2ca1a231d08=`

```json
{
  "data": {
    "field": "{aes-256-cbc}cf3d490f602b718d5694e2ca1a231d08="
  }
}
```
##### Generating Encrypted Config
A tool is provided, ps-nas/bin/encrypt.js, for encrypting values.

Typical usage is `encrypt.js -c <cipher> <key> <data>`.  The default cipher is aes-256-cbc.

##### Bypassing prompt
The key can either be specified as an environment variable, `decryptionKey`, or included in the security section of the config file.
**Storing the key in the config isn't secure and is only suggested for avoiding sensitive data in plain text**.

```json
{
  "security": {
    "key": "myKey"
  }
}
```

### Express JS Service
The ExpressJS service is responsible for loading express and all the handlers.
It's possible to host multiple express apps on multiple ports with different sets of handlers.

#### Configuring an express app
There's an express app named *default* hosted on port 3000.  The port can be modified in the config for the express service:

```json
"express": {
    "default": {
      "port": 3000 //Change to desired port
    }
}
```

Additional apps can be created with different names.  For example, to add an *admin* app on port 3001, use the config

```json
"express": {
    "admin": {
      "port": 3001
    }
}
```

#### Adding handlers
Handlers are automatically loaded from the *handlers* directory of the application.

A Handler is just a module with an init method of the form
```js
function(server, express, done) {
    ...
}
```
The three parameters are
    * server - the main server object from which other services can be referenced.
    * express - the express service
    * done - a callback of the form done(err) to be called when registration is complete

Example handler module that registers one endpoint on the default app and one on the admin app.

 ```json
 module.exports.init = function(server, express, done) {

     express.default.get('/foo', function(req, res) {
         res.status(200).send('Default Endpoint');
     });

     express.admin.get('/bar', function(req, res) {
              res.status(200).send('Admin Endpoint');
          });

     done();

 };

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

## Testing
Unit tests based on node-unit are available in the *test* directory.  The tests can be executed through npm:

```bash
$ npm test
```
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
  server.get('logger').info('initializing my service');
}

exports.doSomething = function() {
  ...
}

```

The *cfg* parameter is the config for that service.  This is a short-cut for having to explicitly look up the config through the config service using `server.get('config').get(<serviceName>)`.
More details are described in the config service section.

After initialization, the service can be acquired through the `get(...)` method on the server.
```js
  var myService = server.get('MyService');
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
  var logger = server.get('logger');
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

## Express 

ps-nas is primarily a server for express js applications, and enables the development of express apps through a combination of services, handlers, and middlware.

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
**server** is the main server object from which other services can be referenced.  **express** is the express service from which the express apps can be obtained.  **done** is a callback of the form `done(err)` to be called when registration is complete.

Below is an example handler module that registers one endpoint on the *default* app and one on the *admin* app.

 ```js
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
 
### Middleware Services

Middleware services are special services specifically for express middleware.  Rather than being loaded at server startup based on dependencies, middleware is explicitly loaded by the middleware service based on the order the middleware is listed in *middleware* property of the config.

```json
  "middleware": ["csrf", "cors", "session"]
```

The service modules themselves are loaded out of the *middleware* directory of the app.  They're similar to normal services except that the `init` method takes an additional *apps* parameter, which is a mapping of application ID (as defined in the express config) to the express js app.

```js
exports.init = function(server, apps, cfg, callback) {
   apps.default.use(...);
```

## Built-in Middleware Services

### CORS

Use CORS to configure Cross-Origin Resource Sharing.  See Node's [CORS module](https://github.com/troygoode/node-cors) for available options.

### CSRF
Enables origin-based cross site request forgery protection.  Rather than the traditional token-based protection, this checks the browser's [Origin header](http://tools.ietf.org/id/draft-abarth-origin-03.html) against a white list of acceptable hosts to determine whether a given request is allowed.

To configure, specify an array of all the allowed origins.

```json
"csrf": {
    "allowedOrigins": ["http://localhost:3000"]
}
```

### Session
Enables a cookie-based session.  The session configuration requires one or more keys used to sign the cookie.

```json
"session": {
    "keys": ["sessionkey"]
}
```

Once enabled, the session can be accessed through the request object.  See the [cookie-session](https://github.com/expressjs/cookie-session) documentation for more information.

## SSL
SSL can be enabled through the *ssl* property of the express service configuration.

```json
 "express": {
    "admin": {
      "port": "3001",
      "ssl": {
        "key": "certs/server.key",
        "cert": "certs/server.crt",
        "passphrase": "devmode"
      }
    }
  }
```
It supports any of the options supported by [Node's TLS server]( http://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener).  Any file-based options, e.g. *key*, *cert*, *ca*, are resolved relative to the application's root directory.

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

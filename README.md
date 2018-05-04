![BlueOak Logo](https://github.com/BlueOakJS/blueoak-server/wiki/images/blueoak.png)
======

BlueOak Server is a NodeJS framework for building RESTful APIs.

[![Build Status](https://travis-ci.org/BlueOakJS/blueoak-server.svg?branch=master)](https://travis-ci.org/BlueOakJS/blueoak-server)
[![npm version](https://img.shields.io/npm/v/blueoak-server.svg)](https://www.npmjs.com/package/blueoak-server)

BlueOak Server is _swagger-matic_, that is, it maximizes the value of your Swagger API by using it to drive runtime behavior.  
BlueOak Server loads your Swagger API, connects the paths it defines to your implementation code, exposes that API to the network, and validates that every request is well-formed per that API.

Check out the documentation on our wiki: <https://github.com/BlueOakJS/blueoak-server/wiki>

Why'd we do it? (and tell me more about it) - check out the [announcement blog][blog1].  
How can it benefit me and my projects? - check out this [experience report][blog2].

### Overview

BlueOak Server combines some of the best Node libraries into a single tool for building RESTful APIs.  It uses Express under the covers, but adds many additional features:

- Swagger integration
- Easy configuration
- Clustering
- Logging
- Dependency injection

Projects use the following directory structure.

```
├── [your_project_name]/
│   ├── index.js <-- optional Main script
│   ├── package.json
|   ├── config/
|   |     └── default.json
│   ├── handlers/
│   ├── services/
│   ├── middleware/
│   ├── swagger/
│   ├── test/
|   |   ├── bos-mocks/
|   |   |   ├── middleware/
|   |   |   ├── services/
```

#### Handlers
[Handlers](https://github.com/BlueOakJS/blueoak-server/wiki/Handlers) contain Express route-handling functions.  They can either be directly wired to routes on the Express _app_, or defined using Swagger.

To use the _app_ directly, simply create a js file in the handlers directory that exports an `init` function.
The `init` function is called during server startup and injected with the the _app_ automatically.

```js
exports.init = function(app) {
  app.get('/', function(req, res) {
    res.json({});
  });
}

```

#### Services
[Services](https://github.com/BlueOakJS/blueoak-server/wiki/Services) do most of the heavy lifting.  Like handlers, services contain init functions that are called during server startup.  However, services can export other functions, and those functions can be invoked from handlers.

Here's an example of a fizzbuzz service (services/fizzbuzz.js).  You'll notice it has an init method with two parameters, _logger_ and _callback_.  The _logger_ is a [built-in service](https://github.com/BlueOakJS/blueoak-server/wiki/Logging-Service) for logging.  The _callback_ is an optional parameter used for cases where services need to perform asynchronous operations during startup.  The service also exports a _getResult_ function.  Any service or handler with a dependency on _fizzbuzz_ can invoke `fizzbuzz.getResult`.

```js
exports.init = function(logger, callback) {
  logger.info("Starting FizzBuzz service");
  callback();
}

exports.getResult = function(num) {
    if (num % 15 === 0) {
        return "FizzBuzz";
    } else if (num % 3 === 0) {
        return "Fizz";
    } else if (num % 5 === 0) {
        return "Buzz";
    } else {
        return num;
    }
};

```

We want to use that service from our handler, so we include `fizzbuzz` as a parameter of the `init` function.
The server will ensure that the fizzbuzz service is initialized during server startup and passed to the handler.

```js
exports.init = function(app, fizzbuzz) {

  app.get('/fizzbuzz/:num', function(req, res) {
    var num = req.params.num;
    res.json({
        result: fizzbuzz.getResult(num)
     });
  });

}
```
#### Third-party Services
Services can be published as npm modules and pulled into projects through the `npm install` command.

For example, the bos-couchdb service adds the ability to connect to a CouchDB database.
It can be installed to a blueoak-server project using

```bash
$ npm install bos-couchdb --save
```

Once installed, it can be used in any service or handler through the dependency-injected `bosCouchdb` parameter.

```js
exports.init = function(config, logger, bosCouchdb) {
  var myDb = bosCouchdb.get('mydb');
}

```

* [bos-couchdb](https://github.com/BlueOakJS/bos-couchdb) - service for connecting to CouchDB databases

#### Config
[Configuration](https://github.com/BlueOakJS/blueoak-server/wiki/Services#config) is stored in json files in the _config_ directory.  Values can be accessed through the `config` service in handers and services.  Configuration also supports layering on environment-specific config as well as encrypted values.

```js
exports.init = function(config) {
  var myServiceConfig = config.get('myService');
}
```

#### Middleware
[Middleware](https://github.com/BlueOakJS/blueoak-server/wiki/Middleware) are similar to services but used to wire up Express middleware.  The _express_ section of the config determines which middleware is loaded and in which order.

```json
{
  "express": {
    "middleware": ["csrf", "cors", "session", "body-parser"]
  }
}
```

#### Swagger (OpenAPI)

[Swagger](https://github.com/BlueOakJS/blueoak-server/wiki/Handlers#swagger) files in the _swagger_ directory are read during server startup and automatically wired up to handlers. Swagger files can be in either json or yaml formats.

We've really focused on making API development with Swagger and BlueOak Server to be excellent.  
[Checkout our ideas on best practices][blog3].

At a high-level, BlueOak Server's Swagger support provides the following:
* Automatic app routing from the API method to the function as defined in the Swagger
* Request parameter validation, including the body model, based on your method definion
* Reponse model validation based on your method definitions during development
* JSON `$ref`s to external Swagger documents on the file system
* Multiple top-level Swagger API definitions supporting delivery of multiple API base paths
* Publishing of the fully compiled Swagger spec for input to by tools such as [`Swagger-UI`](http://swagger.io/swagger-ui/) and [`swagger-commander`](https://www.npmjs.com/package/swagger-commander)

#### Mocking

Services and middleware can be mocked for testing by creating mocks in the `test/bos-mocks/services` or `test/bos-mocks/middleware` directories. The mock file name should match the file name of the service or middleware you wish to mock. The implementation of a mock is no different than a normal service or middleware implementation. After you have implemented your mocks, you can instruct BlueOak Server to use them by specifying them as a comma-separated list in the `--mock-services` or `--mock-middleware` command line arguments. For example: `blueoak-server --mock-services service1,service2 --mock-middleware middleware1,middleware2`

### Installation

```bash
$ npm install -g blueoak-server
```

-or-

```bash
$ npm install --save blueoak-server
```

### Usage

If installed globally, run _blueoak-server_ from within your project's directory.
e.g.:
```bash
$ blueoak-server
```

If installed at a package level, call _blueoak-server_ in the `npm start` script.
e.g.:
```json
  "scripts": {
    "start": "blueoak-server"
  }
```

Alternatively, it can be launched programmatically from your own js script.


```js
var server = require('blueoak-server');

server.init(function(err) {
    if (err) {
        console.warn(err);
    } else {
        console.log('started');
    }
});
```

The programmatic approach works well during development with tools like nodemon,
which monitor for file changes and automatically restart the server.

### Next steps

Read through the [docs](https://github.com/BlueOakJS/blueoak-server/wiki) and look at the our [examples](/examples).

When you're ready to try it out, start from the [template](https://github.com/BlueOakJS/blueoak-server-template).

<!-- links -->
[blog1]: http://www.pointsource.com/blog/blueoak-server-released-to-open-source-to-accelerate-nodejs-development?utm_campaign=blueoak&utm_medium=social&utm_source=github&utm_content=PointSource
[blog2]: http://www.pointsource.com/blog/nodejs-experience-report-building-a-custom-mobile-backend-with-blueoak-server?utm_campaign=blueoak&utm_medium=social&utm_source=github&utm_content=PointSource
[blog3]: http://www.pointsource.com/blog/3-best-practices-for-api-development-with-swagger?utm_campaign=blueoak&utm_medium=social&utm_source=github&utm_content=PointSource

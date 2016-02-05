![BlueOak Logo](https://github.com/BlueOakJS/blueoak-server/wiki/images/blueoak.png)
======

BlueOak Server is a framework for building RESTful APIs in NodeJS.

Check out the documentation on our wiki: https://github.com/BlueOakJS/blueoak-server/wiki

### Overview

BlueOak Server combines some of the best Node libraries into a single tool for building RESTful APIs.

Projects use the following directory structure.

```
├── [your_project_name]/
│   ├── index.js <-- optional Main script
│   ├── package.json
|   ├── config/
│   ├── handlers/
│   ├── services/
│   ├── middleware/
│   ├── swagger/
```

#### Handlers
Handlers contain Express route handling functions.  They can either be directly wired to routes on the Express _app_, or defined using Swagger.

To use the _app_ directly, simply create a js file in the handlers directory that exports an `init` function.
The `init` function is called during server startup and injected with the the _app_ automatically.

```js
exports.init = function(app) {
  app.get('/', function(req, res) {
    res.json({});
  });
}

```

### Services
Services do most of the heavy lifting.  Like handlers, services contain init functions that are called during server startup.
However, services can export other functions, and those functions can be invoked from handlers.

Here's an example of a fizzbuzz service (services/fizzbuzz.js).  You'll notice it has an init method with two parameters, logger and callback.  The logger is a built-in service.  The _callback_ is an optional parameter used for cases where services need to perform asynchronous operations during startup.  The service also exports a _getResult_ function.  Any service or handler with a dependency on _fizzbuzz_ can invoke `fizzbuzz.getResult`.

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

### Installation

```bash
$ npm install -g blueoak-server
```

If installed globally (using the -g option), a `blueoak-server` command will be available on the path for launching the server.

### Usage

If installed globally, run *blueoak-server* from within your project's directory.

```bash
$ blueoak-server
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


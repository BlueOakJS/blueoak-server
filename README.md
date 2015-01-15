ps-nas
======

PointSource Node App Server (Sprout Server) reference implementation.

This is a prescribed framework for building NodeJS-based middleware.

### Features
    * Based on expressjs
    * Supports clustering out of the box
    * Service framework with dependency injection
    * Config and logging services
    * Encrypted config support
    * Built in logging and monitoring

## Getting Started

### Installation

```bash
$ npm install ps-nas
```

If installed globally (using the -g option), a `ps-nas` command will be available on the path for launching the server.

### Directory structure

Here's an example of a typical directory structure.
At a minimum you need a main node script and a config directory containing a default.json.

    project/
        index.js //main script
        package.json
        config/
            default.json
        handlers/
        services/
        middleware/

A [Yeoman generator](https://github.com/PointSource/generator-sprout-server) for setting up a project is also available.

### Usage

If installed globally, simply run *ps-nas* from within your project's directory.

```bash
$ ps-nas
```

Alternatively, it can be launched programmatically from your own js script.


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

The programmatic approach works well during development with tools like nodemon,
which monitor for file changes and automatically restart the server.

### Next steps

Read through the [docs](./docs) and look at the [helloworld sample app](./examples/helloworld/).


## Testing

Unit tests based on mocha are available in the *test* directory.  The tests can be executed through npm:

```bash
$ npm test
```

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

## Getting Started

### Installation

It can either be installed globally so that it can be launched through the `ps-nas` CLI command.

```bash
$ npm install -g git+https://github.com/PointSource/ps-nas.git
```

Or it can be installed as a local dependency and launched programmatically.

```bash
$ npm install git+https://github.com/PointSource/ps-nas.git --save
```

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

### Usage

If installed globally, simply run *ps-nas* from within your project's directory.

```bash
$ ps-nas
```

Alternatively, it can be launched programmatically from your own script.


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

### Next steps

Read through the [docs](./docs) and look at the [helloworld sample app](../examples/helloworld/).


## Testing

Unit tests based on mocha are available in the *test* directory.  The tests can be executed through npm:

```bash
$ npm test
```

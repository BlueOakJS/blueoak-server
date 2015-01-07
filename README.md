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

Until an npm repo is available, the easiest way to install ps-nas is to add the git repo URL to the dependency list in package.json.

```json
"dependencies": {
  "ps-nas": "git+https://github.com/PointSource/ps-nas.git"
}
```

Alternatively you can clone the git project to a local directory and use `npm link` to link it to your project.

```bash
$ npm link path/to/ps-nas
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

Here's an example of starting the server form the main script.

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

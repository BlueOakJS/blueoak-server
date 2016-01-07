blueoak-server
======

This is a prescribed framework for building NodeJS-based middleware.

Check out the documentation on our wiki: https://github.com/PointSource/sprout-cli/wiki/Sprout-Server

### Installation

```bash
$ npm install blueoak-server
```

If installed globally (using the -g option), a `blueoak-server` command will be available on the path for launching the server.

### Usage

If installed globally, simply run *blueoak-server* from within your project's directory.

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

Read through the [docs](https://github.com/PointSource/sprout-cli/wiki/Sprout-Server) and look at the [helloworld sample app](./examples/helloworld/).

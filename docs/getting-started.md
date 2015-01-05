# Getting Started

### Installation

```bash
$ npm install ps-nas --save
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

Read through the documentation [topics](express.md) and look at the [helloworld sample app](../examples/helloworld/README.md).
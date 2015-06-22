# Logger
The logging service uses [winston](https://github.com/winstonjs/winston).
Out of the box log levels debug, verbose, info, warn, and error are supported.


```js
  var logger = server.get('logger');
  logger.debug('debug message');
  logger.info('info message');
  logger.warn('warn message');
  logger.error('error message');
```

### Configuration

#### Configuring transports
Additional transports can be used in place of the default console transport.
Here you can see a mongodb transport being used.

```json
 "logger": {
    "transports": [
      {
        "package": "winston-mongodb",
        "field": "MongoDB",
        "options": {
          "db": "test"
        }
      }
    ]
  }
 ```

A transport requires a package, field, and options.
The package will be loaded through `require`, the specified field will than be added to the logger with the given options.

For example, to use the file transport, the config might look like

```json
 "logger": {
    "transports": [
      {
        "package": "winston",
        "field": "transports.File",
        "options": {
          "filename": "foo.log"
        }
      }
    ]
  }
```

Or to use the console transport with a different log level

```json
    "transports": [
      {
        "package": "winston",
        "field": "transports.Console",
        "options": {
          "level": "info",
          "colorize": true
        }
      }
    ]
```
# Logger
The logging service is a basic logger that logs to stdout.  By default it supports levels of debug, info, warn, and error.

```js
  var logger = server.get('logger');
  logger.debug('debug message');
  logger.info('info message');
  logger.warn('warn message');
  logger.error('error message');
```

### Configuration

#### Custom levels
Additional log levels can be specified in the logger config.  The levels will be lowercased when registered.

The example below will create a `logger.foo(...)` method on the logger.

```json
{
  "logging": {
    "levels": ["FOO"]
  }
}
```

#### Formatting options

The default format of the log messages is **(<PID>) <LEVEL> [<TIMESTAMP>] <message>**

The format can be customized with the following config options:
* color - true/false.  Enable or disable color coding of messages.  Defaults to true
* showPID - true/false/'auto'.  Whether to show the PID.  If set to auto, PID will only be shown when there's more than one worker.  Defaults to auto.
* timestamp - 'iso'/'ms'/'none'. Formats the timestamp to either an ISO date, milliseconds time, or disable.  Defaults to iso.

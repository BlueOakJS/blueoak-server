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

### Log entry timestamps
Many transports allow timestamps to be turned on using option.timestamp=true|false|function syntax.
However, since the server runtime uses text based configuration i.e. JSON rather
than direct object configuration, it's not possible to define the timestamp function using an inline function definition.

Instead, the server runtime provides the ability to specify a module to handle the timestamp function. Using this mechanism, the timestamp
value can be specified as true|false|modulename where modulename is the name of a node module that will be loaded at server startup.

If a module is specified, the function result will be used as the timestamp value for each log record.

Here's an example transport definition using a timestamp module:

    "transports" : [
          {
              "package" : "winston",
              "field" : "transports.Console",
              "options": {
                  "colorize":false,
                  "timestamp" : "logging/timestamp", // NOTE: path is relative to server base directory i.e. ./logging/timestamp.js
                  "level":"debug"
              }
          }
    ],



Here's an example time stamp module:

    /* return timestamp as string */
    module.exports.init = function() {
      console.log('timestamp init called.');
    }
    module.exports.timestamp = function() {
      var d = new Date();
      return ""+Date.now() + ' ' + d.getFullYear() + '/' + (d.getMonth()+1) + '/' + d.getDate()+' ' + d.getHours() + ':' + d.getMinutes()+ ':' + d.getSeconds() + '.' + d.getMilliseconds();
    }

The init and timestamp entry points are required.
The module may do any initialization necessary in init().
Init is called once at server startup.
The timestamp function is free to format the timestamp string as desired.


### Configuring Component Loggers
It is possible to define loggers for specific components.
Each component may override its log level.
To use this feature, define the transports for the base logger (i.e. the default logger) as described above.
Then add a components field to the logger config json.
Example json:


    "transports": [
      {
        "package": "winston",
        "field": "transports.Console",
        "options": {
          "level": "info",
          "colorize": true
        }
      }
    ],
    "components" : {
        "mycomp1": {
            "loglevels" : {
                "console": "debug",
                "file" : "debug"
            }
        },
        "mycomp2": {
            "loglevels" : {
                "console": "debug"
            }
        },
        "mycomp3": {
            "loglevels" : {
                "console": "debug"
            }
        }
    }

In the component code that has access to the logger injected by the server runtime,
use the following syntax to access a component logger:

    var myLogger = logger.getComponentLogger('mycomp1'); // or mycomp2 or mycomp3

Using the component logger from that point is exactly the same as the standard logger.
The component name will be logged to denote the log entry source.

The server runtime will associate all transports created for the default logger with the component loggers automatically.
So all entries logged to the component loggers will go to the same destination(s) as the default logger.

Each of these loggers may override the log level for each transport and the original logger is still available using the log level defined in the transport.
Any transport log levels not specifically overridden by a component will default to the log level of the transport defined for the default logger.







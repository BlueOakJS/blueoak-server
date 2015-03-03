# Monitoring
The monitor service is a client for communicating with the [StatsD](https://github.com/etsy/statsd/) daemon.
StatsD can then integrate with many back-end monitoring services, such as Librato, Datadog, or Graphite.

### Configuration

StatsD communicates via UDP and at a minimum needs a host and a port.
The port defaults to 8125.  The *debug* parameter can be enabled to log all monitoring calls to stdout.

```json
"monitor": {
  "host": "localhost"
}
```

### API

The monitoring service uses the [Node StatsD client](https://github.com/sivy/node-statsd).
Check out their documentation for more details.

To use the monitoring service, include the *monitor* parameter in your init method.

```js
exports.init = function(monitor) {
    monitor.increment('some.stat.value');
}
```

The service provides several ways to record stats.

#### increment
Increment a counter by 1, or by the optional value.

```js
monitor.increment('some.counter'); //increment by 1
monitor.increment('some.counter', 10); //increment by 10
```

#### decrement
Decrement a counter by 1, or by the optional value.

```js
monitor.decrement('some.counter'); //decrement by 1
monitor.decrement('some.counter', -10); //decrement by 10
```

#### gauge
Set a counter to a specific value.

```js
monitor.gauge('some.value', 99); //set counter to 99
```

#### unique
Counts unique occurrences of a stat

```js
monitor.unique('some.value', 'foobar');
```

#### timing
Record the duration of an event.

```js
monitor.timing('some.time', 55); //record 55 ms
```

#### express
Use to get an express function that can be added to a route.

```js
app.get('/hello', monitor.express('myPrefix'), function(req, res) {
  ...
}
```

### Express JS
In addition to the express function, there's also a middleware service for enabling monitoring on all routes.
See the sprout-server express middleware document for information on integrating with express.

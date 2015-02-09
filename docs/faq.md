### Why shouldn't I just create an express app from scratch?

Express is great but doesn't provide a very rigid structure for setting up an application.
It encourages configuration to be in code rather than config files.
With ps-nas you get the best of both worlds--
all the power of express but with improved configuration and a lot of the boilerplate removed.

### When should I use a service versus a plain old module?
Services work well in cases where you need to perform some sort of initialization at server startup,
or if there's some sort of configuration associated with your code.
Imagine needing to connect to an SQL database.
You're going to need hostnames, ports, usernames, and passwords to establish a connection.
And you probably want to attempt to make a connection during startup to ensure the server is available.
In that case a service is a good choice.

Also, there are some cases that config files aren't adequate for properly configuring a service.
For example, a custom log formatter is going to be a JavaScript function,
and it doesn't make sense to try to represent that in a json file.

### How to I access a service in a plain old module?
Use the global `services` object.  While there's both a sync and async version of the method, the async version is better for most cases.

```js
   services.get('my-service', function(myService) {
      ...
   });
```
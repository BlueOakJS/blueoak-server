# Express

ps-nas is primarily a server for express js applications, and enables the development of express apps through a combination of services, handlers, and middlware.

### Express JS Service
The ExpressJS service is responsible for loading express and all the handlers.

#### Configuring an express app
Express is configured through the *express* section of the config file.
By default the express app will start on port 3000, but that can be modified.

```json
"express": {
    "port": 8080
}
```

#### Adding handlers
Handlers are automatically loaded from the *handlers* directory of the application.

A Handler is just a module with an init method that references the express app through the *app* parameter.
```js
function(app, callback) {
    ...
}
```

If the handler needs to reference other services, it can do so using thd dependency injection mechanism,
simply adding a parameter to the init method with the name of the service.

Below is an example handler module that registers one endpoint on the app.

 ```js
 module.exports.init = function(app) {

     app.get('/foo', function(req, res) {
         res.status(200).send('Default Endpoint');
     });

     app.get('/bar', function(req, res) {
         res.status(200).send('Admin Endpoint');
      });

 };

 ```

Like services, a parameter named *callback* can be used if the handler needs to be registered asynchronously.

### Middleware Services

Middleware services are special services specifically for express middleware.
Rather than being loaded at server startup based on dependencies,
middleware is explicitly loaded by the middleware service based on the order the middleware is listed in *middleware* property of the config.

```json
"express": {
  "middleware": ["csrf", "cors", "session"]
 }
```

The middleware modules are loaded out of the *middleware* directory of the app.
They're similar to normal services except, like handlers, they can reference the express app through the *app* parameter of the init call.
While middleware services can reference other services using dependency injection, other services won't be able to reference the middleware.

```js
exports.init = function(app, callback) {
   app.use(...);
```

### Built-in Middleware Services

#### CORS

Use CORS to configure Cross-Origin Resource Sharing.  See Node's [CORS module](https://github.com/troygoode/node-cors) for available options.

#### CSRF
Enables origin-based cross site request forgery protection.  Rather than the traditional token-based protection, this checks the browser's [Origin header](http://tools.ietf.org/id/draft-abarth-origin-03.html) against a white list of acceptable hosts to determine whether a given request is allowed.

To configure, specify an array of all the allowed origins.

```json
"csrf": {
    "allowedOrigins": ["http://localhost:3000"]
}
```

#### Session
Enables a cookie-based session.  The session configuration requires one or more keys used to sign the cookie.

```json
"session": {
    "keys": ["sessionkey"]
}
```

Once enabled, the session can be accessed through the request object.  See the [cookie-session](https://github.com/expressjs/cookie-session) documentation for more information.

#### Body parser
Enabled the express [body-parser](https://github.com/expressjs/body-parser) on all routes.

Body parser supports four types: urlencoded, json, raw, text, which each have their own options.
One or more of the types can be enabled by including the appropriate field in the bodyParser config.
However, keep in mind that settings like verify and reviver cannot be configured through this service.
If such functions are needed, it's better to write a custom middleware service for that use.

Additionally there might be situations where it's necessary to use different parsers for different routes.
That scenario will require a custom solution.

Example to enable and configure both json and urlencoded parser.

```json
"bodyParser": {
  "json": {
    "strict": true
  },

  "urlencoded": {
  }
}
```

### SSL
SSL can be enabled through the *ssl* property of the express service configuration.

```json
 "express": {
   "port": "3001",
   "ssl": {
     "key": "certs/server.key",
     "cert": "certs/server.crt",
     "passphrase": "devmode"
   }
 }
```
It supports any of the options supported by [Node's TLS server]( http://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener).  Any file-based options, e.g. *key*, *cert*, *ca*, are resolved relative to the application's root directory.

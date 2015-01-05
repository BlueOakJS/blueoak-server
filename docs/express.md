# Express

ps-nas is primarily a server for express js applications, and enables the development of express apps through a combination of services, handlers, and middlware.

### Express JS Service
The ExpressJS service is responsible for loading express and all the handlers.
It's possible to host multiple express apps on multiple ports with different sets of handlers.

#### Configuring an express app
There's an express app named *default* hosted on port 3000.  The port can be modified in the config for the express service:

```json
"express": {
    "default": {
      "port": 3000 //Change to desired port
    }
}
```

Additional apps can be created with different names.  For example, to add an *admin* app on port 3001, use the config

```json
"express": {
    "admin": {
      "port": 3001
    }
}
```

#### Adding handlers
Handlers are automatically loaded from the *handlers* directory of the application.

A Handler is just a module with an init method of the form
```js
function(server, express, done) {
    ...
}
```
**server** is the main server object from which other services can be referenced.  **express** is the express service from which the express apps can be obtained.  **done** is a callback of the form `done(err)` to be called when registration is complete.

Below is an example handler module that registers one endpoint on the *default* app and one on the *admin* app.

 ```js
 module.exports.init = function(server, express, done) {

     express.default.get('/foo', function(req, res) {
         res.status(200).send('Default Endpoint');
     });

     express.admin.get('/bar', function(req, res) {
         res.status(200).send('Admin Endpoint');
      });

     done();

 };

 ```

### Middleware Services

Middleware services are special services specifically for express middleware.  Rather than being loaded at server startup based on dependencies, middleware is explicitly loaded by the middleware service based on the order the middleware is listed in *middleware* property of the config.

```json
  "middleware": ["csrf", "cors", "session"]
```

The service modules themselves are loaded out of the *middleware* directory of the app.  They're similar to normal services except that the `init` method takes an additional *express*  parameter, which is a mapping of application ID (as defined in the express config) to the express js app.

```js
exports.init = function(server, express, cfg, callback) {
   express.default.use(...);
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

### SSL
SSL can be enabled through the *ssl* property of the express service configuration.

```json
 "express": {
    "admin": {
      "port": "3001",
      "ssl": {
        "key": "certs/server.key",
        "cert": "certs/server.crt",
        "passphrase": "devmode"
      }
    }
  }
```
It supports any of the options supported by [Node's TLS server]( http://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener).  Any file-based options, e.g. *key*, *cert*, *ca*, are resolved relative to the application's root directory.

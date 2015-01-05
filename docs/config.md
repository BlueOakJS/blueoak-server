# Config Service

Configuration is stored in JSON files with the *config* directory of the application.
The config service is based off of the [node-config](https://github.com/lorenwest/node-config) project, which supports a hierarchy of config files and allows for environment-specific configuration.
Comments are allowed in the JSON files.

Typically there will be at least a *defaults.json* config file.

### Service Config
Typically each service has its own top-level field in the config, e.g. *logger* for the logger service and *express* for the express service.

Each field can contain any either an array or object.

```json
{
  "service1": {
    "test": true
  },

  "service2": ["foo", "bar"]
}
```


### API

To access the config data, use the `config.get(...)` method.

```json
{
  "myConfig": {
    "foo": "bar"
  }
}
```

```js
var fooValue = server.config.get('myConfig').foo; //fooValue === "bar"
```

### Securing Config Files
The config can contain encrypted strings.  If an encrypted string is found in the value of an array or object,
the server will prompt for a password during startup.

The format for encrypted values is `{cipher}value=`, e.g. `{aes-256-cbc}cf3d490f602b718d5694e2ca1a231d08=`

```json
{
  "data": {
    "field": "{aes-256-cbc}cf3d490f602b718d5694e2ca1a231d08="
  }
}
```
#### Generating Encrypted Config
A tool is provided, ps-nas/bin/encrypt.js, for encrypting values.

Typical usage is `encrypt.js -c <cipher> <key> <data>`.  The default cipher is aes-256-cbc.

#### Bypassing the password prompt
The key can either be specified as an environment variable, `decryptionKey`, or included in the security section of the config file.
**Storing the key in the config isn't secure and is only suggested for avoiding sensitive data in plain text**.

```json
{
  "security": {
    "key": "myKey"
  }
}
```
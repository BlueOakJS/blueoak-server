/*
 * Use the express-static library to enable static file loading on all express.js apps and endpoints.
 *
 * All config options are passed directly to the express-static library.
 * See https://github.com/song940/express-static for more information
 *
 * Add a JSON block to the application default.json with the following:
 *    "express-static" : {
 *       "docs": "./www"
 *    }
 *    This will serve the static content from the www directory relative to the default
 *    application server directory.
 *
 * To enable: add "express-static" to the middleware list of services to load in default.json.
 */

var path = require('path'),
      es = require('express-static');

var logger = null;

exports.init = function(app, config, logger, callback) {
  cfg = config.get('express-static');
  var docsDir = path.resolve(global.__appDir, cfg.docs);
  logger.info('Serving content from: %s', docsDir);
  app.use(es(docsDir));
  callback();
};

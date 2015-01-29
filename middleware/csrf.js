var whitelist = [];
var _logger = null;

exports.init = function(app, logger, config, callback) {

    _logger = logger;

    whitelist = config.get('csrf').allowedOrigins;
    app.use(csrfCheck);
    logger.debug('Enabled CSRF protection.');
    callback();
};

/* From the Origin spec
 *
 * If the request method is safe (as defined by RFC 2616, Section 9.1.1, e.g. either "GET" nor "HEAD"), return "MUST NOT modify state" and abort these steps.
 * If the request does not contain a header named "Origin", return "MAY modify state" abort these steps.
 * For each request header named "Origin", let the /initiating origin list/ be the list of origins represented in the header:
 * If there exists a origin in the /initiating origin list/ is not a member of the /origin white list/ for this server, return "MUST NOT modify state" and abort these steps.
 * Return "MAY modify state".
 */
function csrfCheck(req, res, next) {

    //Only check for non-GET requests, since GETs don't modify state
    if ('GET' !== req.method && 'HEAD' !== req.method) {

        if (req.get('Origin')) {

            var foundMatch = false;
            for (var i = 0; i < whitelist.length; i++) {
                //whitelist can also contain regexps
                if (whitelist[i] instanceof RegExp && whitelist[i].test(req.headers.origin)) {
                    return next();
                } else if (whitelist[i] === req.headers.origin) {
                    return next();
                }
            }

            _logger.warn('CSRF request failed for origin, %s', req.headers.origin);
            return res.sendStatus(400);
        } else {
            next();
        }
    } else {
        next(); //no need to check origin
    }

}
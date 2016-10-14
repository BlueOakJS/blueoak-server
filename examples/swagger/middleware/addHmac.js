var sjcl = require('sjcl'),
    urlParse = require('url-parse');

exports.init = function (app) {
    app.use(function (req, res, next) {
        if (req.path.indexOf('superfuntime') !== -1) {
            var apiId = '285cd308-1564-4090-b3b4-ce5cfa697c4c';
            var apiKey = 'JfOJ15SI7EGjDLX1h8zPB19Zr88ONMPKbBQJozMI0Ag';
            var contentMd5 = req.headers['Content-MD5'] || '';
            var contentType = req.headers['Content-Type'] || '';
            var dateString = new Date().toString();

            var urlPath;
            if (urlParse) {
                urlPath = urlParse(req.url).pathname;
            }
            var stringToSign = req.method.toUpperCase() + '\n' +
                contentMd5 + '\n' +
                contentType + '\n' +
                dateString + '\n' +
                urlPath;

            var key = sjcl.codec.utf8String.toBits(apiKey);
            var out = (new sjcl.misc.hmac(key, sjcl.hash.sha256)).mac(stringToSign);
            var hmac = sjcl.codec.base64.fromBits(out);
            req.headers.Authorization = 'SFI ' + apiId + ':' + hmac + ':' + dateString;
        }
        next();
    });
};

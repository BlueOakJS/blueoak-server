var sjcl = require('sjcl'),
    urlParse = require('url-parse');

exports.init = function() {

};

exports.getFunTimeById = function(req, res, next) {
    res.status(200).json({
        'curiousPeople': [
            {
                'kind': 'OtherPerson',
                'curiousPersonReqField': 'hey!',
                'enthusiasticPersonReqField': 'hola!'
            }
        ]
    });
};

exports.addHmac = function (req, res, next) {
    var apiId = '111';
    var apiKey = 'key';
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
};


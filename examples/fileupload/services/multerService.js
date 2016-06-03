var multer = require('multer'),
    log;

exports.init = function (logger) {
    log = logger;
};

exports.storage = multer.diskStorage({
    destination: function (req, file, cb) {
        log.debug('destination: uploads/');
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        var filename = file.fieldname + '-' + Date.now();
        log.debug('filename: ', filename);
        cb(null, filename);
    }
});

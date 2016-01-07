
exports.fileUpload = function(req, res, next) {
    console.log('FILE UPLOAD!');
    console.log(req.files.file1);
    console.log(req.body.text);
    res.json({ files: req.files, number: req.body.text});
};

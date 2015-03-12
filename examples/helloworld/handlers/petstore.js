exports.findPets = function(req, res, next) {
    res.status(200).json({});
}

exports.findPetById = function(req, res, next) {
    res.status(200).json({});
}

exports.addPet = function(req, res, next) {
    console.log(req.body);
    res.status(201).json({});
}
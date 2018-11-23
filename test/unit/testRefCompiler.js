var _ = require('lodash'),
    assert = require('assert'),
    path = require('path'),
    fs = require('fs'),
    parser = require('swagger-parser'),
    logger = require('../../testlib/mocks/logger'),
    refCompiler = require('../../lib/swaggerRefCompiler');

var swaggerExampleDir = path.resolve(__dirname, '../../examples/swagger');

var config = {
    'context': '/swagger',
    'refCompiler': {
        'api-v1': {
            'baseSpecFile': 'api-v1.yaml',
            'refDirs': [
                'public'
            ]
        }
    }
};

function doRefCompilation(rootDir, logger, config) {
    global.__appDir = rootDir;
    refCompiler.compileSpecs(logger, config);
}

describe('Swagger spec building test', function () {

    before(function (callback) {
        doRefCompilation(swaggerExampleDir, logger, config);
        callback();
    });
    
    it('should have all definitions and parameters', function (done) {
        parser.parse(path.join(swaggerExampleDir, 'swagger/api-v1.yaml'), 'utf-8')
            .then(function(specs) {
                var definitionsCount = fs.readdirSync(path.join(swaggerExampleDir,
                    'swagger/public/definitions')).length;
                var parametersCount = fs.readdirSync(path.join(swaggerExampleDir,
                    'swagger/public/parameters')).length;
                assert.equal(_.keys(specs.definitions).length, definitionsCount);
                assert.equal(_.keys(specs.parameters).length, parametersCount);
                done();
            }).catch(function (err) {
                done(err);
            });
    });
});

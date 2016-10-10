var assert = require('assert'),
    path = require('path'),
    fs = require('fs'),
    parser = require('swagger-parser'),
    logger = require('../../testlib/mocks/logger'),
    testUtil = require('../../testlib/util'),
    refCompiler = require('../../lib/refCompiler');

var swaggerExampleDir = path.resolve(__dirname, '../../examples/swagger');

var config = {
    'refCompiler': {
        'api-v1': {
            'baseSpecFile': 'api-v1.yaml',
            'refDirs': [
                'public'
            ]
        }
    },
    'swagger': {
        'context': '/swagger'
    }
};

function doRefCompilation(rootDir, logger, config) {
    global.__appDir = rootDir;
    refCompiler.compileSpecs(logger, testUtil.createConfigService(config));
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
                assert.equal(Object.keys(specs.definitions).length, definitionsCount);
                assert.equal(Object.keys(specs.parameters).length, parametersCount);
                done();
            }).catch(function (err) {
                done(err);
            });
    });
});

var fs = require('fs');
var path = require('path');
var refCompilerConfig;
var swaggerDir;
var thisLogger;

exports.compileSpecs = function (logger, cfg) {
    refCompilerConfig = cfg.refCompiler;
    swaggerDir = path.join(global.__appDir, cfg.context);
    thisLogger = logger;
    for (var key in refCompilerConfig) {
        if (/.+\.(yaml)$/i.test(refCompilerConfig[key].baseSpecFile)) {
            compileYAMLReferences(refCompilerConfig[key].baseSpecFile, refCompilerConfig[key].refDirs);
        } else if (/.+\.(json)$/i.test(refCompilerConfig[key].baseSpecFile)) {
            compileJSONReferences(refCompilerConfig[key].baseSpecFile, refCompilerConfig[key].refDirs);
        } else {
            thisLogger.warn('Unknown file extension for base spec file %s', refCompilerConfig[key].baseSpecFile);
        }
    }
};

/**
 * @param  {string} baseSpecFile - file name of the base spec
 *  e.g. 'app-api-mysf-v2.yaml'
 * @param  {string[]} refDirs - list of directories with references to include
 *  e.g. ['v2/public', 'v2/private/mysf']
 */
function compileYAMLReferences(baseSpecFile, refDirs) {
    var baseSpecFilePath = path.join(swaggerDir, baseSpecFile);
    var resourcesChunk = '';
    var fileData = fs.readFileSync(baseSpecFilePath, 'utf8');
    var fileDataPrefix = fileData.split('### ref-compiler: BEGIN')[0];
    resourcesChunk += '### ref-compiler: BEGIN\n';
    var directoryTypes = ['definitions', 'responses', 'parameters'];

    //For each directory type
    directoryTypes.forEach(function (directoryType) {
        var items = [];

        //for each input directory
        refDirs.forEach(function (indir) {
            var files, itemName, relativePath;
            var inDirectory = path.join(swaggerDir, indir, directoryType);

            //if directory exists, read each file name
            try {
                files = fs.readdirSync(inDirectory);
                //get the file names and save all of type .yaml or .json
                files.forEach(function (file) {
                    if (/.+\.(yaml)$/i.test(file)) {
                        items.push(file);
                    }
                });
                if (items.length > 0) {
                    //get the relative path between the output directory and the input directory
                    relativePath = path.relative(swaggerDir, inDirectory);
                    // relativePath = relativePath !== '' ? relativePath + '/' : relativePath;
                    if (resourcesChunk.indexOf(directoryType) === -1) {
                        resourcesChunk += directoryType + ':\n';
                    }
                    //write each item to the output file
                    items.forEach(function (item) {
                        itemName = getItemName(item);
                        resourcesChunk += '  ' + itemName + ':\n  ' +
                            '  $ref: ' + '\'' + path.join(relativePath, item) + '\'' + '\n';
                    });
                    items = [];
                }
            }
            catch (e) {
                //ENOENT errors should be suppressed because not all directory types are required
                if (e.code !== 'ENOENT') {
                    throw e;
                }
            }
        });
    });

    var writeData = fileDataPrefix + resourcesChunk;
    var fd = fs.openSync(baseSpecFilePath, 'w');
    fs.writeSync(fd, writeData);
    fs.closeSync(fd);
}

/**
 * @param  {string} baseSpecFile - file name of the base spec
 *  e.g. 'app-api-mysf-v2.json'
 * @param  {string[]} refDirs - list of directories with references to include
 *  e.g. ['v2/public', 'v2/private/mysf']
 */
function compileJSONReferences(baseSpecFile, refDirs) {
    var baseSpecFilePath = path.join(swaggerDir, baseSpecFile);
    var fileData = fs.readFileSync(baseSpecFilePath, 'utf8');
    var jsonData = JSON.parse(fileData);
    var directoryTypes = ['definitions', 'responses', 'parameters'];

    //For each directory type
    directoryTypes.forEach(function (directoryType) {
        var items = [];
        if (!jsonData[directoryType]) {
            jsonData[directoryType] = {};
        }
        //for each input directory
        refDirs.forEach(function (indir) {
            var files, itemName, relativePath;
            var inDirectory = path.join(swaggerDir, indir, directoryType);

            //if directory exists, read each file name
            try {
                files = fs.readdirSync(inDirectory);
                //get the file names and save all of type .yaml or .json
                files.forEach(function (file) {
                    if (/.+\.(json)$/i.test(file)) {
                        items.push(file);
                    }
                });
                //get the relative path between the output directory and the input directory
                relativePath = path.relative(swaggerDir, inDirectory);
                // relativePath = relativePath !== '' ? relativePath + '/' : relativePath;
                //write each item to the output file
                items.forEach(function (item) {
                    itemName = getItemName(item);
                    jsonData[directoryType][itemName] = {};
                    jsonData[directoryType][itemName].$ref = path.join(relativePath, item);
                });
                items = [];
            }
            catch (e) {
                //ENOENT errors should be suppressed because not all directory types are required
                if (e.code !== 'ENOENT') {
                    throw e;
                }
            }
        });
    });
    var writeData = JSON.stringify(jsonData, null, 2);
    var fd = fs.openSync(baseSpecFilePath, 'w');
    fs.writeSync(fd, writeData);
    fs.closeSync(fd);
}

function getItemName(item) {
    if (item.indexOf('.yaml') !== -1) {
        return item.split('.yaml')[0];
    } else {
        return item.split('.json')[0];
    }
}



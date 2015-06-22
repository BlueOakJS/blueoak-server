/* Copyright © 2015 PointSource, LLC. All rights reserved. */
//used by swagger2js to generate stubs
var astw = require('astw'),
    fs = require('fs'),
    detectIndent = require('detect-indent'),
    _ = require('lodash');

var modExportTemplate = "\n" +
    "//swagger stub for <METHOD> <ROUTE>\n" +
    "module.exports.<OPID> = function(req, res, next) {\n" +
    "<TAB>//TODO: implement <OPID>\n" +
    "<TAB>console.warn('<OPID> not implemented\');\n" +
    "<TAB>next();\n" +
    "};\n";

var exportTemplate = "\n" +
    "//swagger stub for <METHOD> <ROUTE>\n" +
    "exports.<OPID> = function(req, res, next) {\n" +
    "<TAB>//TODO: implement <OPID>\n" +
    "<TAB>console.warn('<OPID> not implemented\');\n" +
    "<TAB>next();\n" +
    "};\n";

var objDeclarationTemplate = "\n\n" +
    "<TAB>//swagger stub for <METHOD> <ROUTE>\n" +
    "<TAB><OPID>: function(req, res, next) {\n" +
    "<TAB><TAB>//TODO: implement <OPID>\n" +
    "<TAB><TAB>console.warn('<OPID> not implemented\');\n" +
    "<TAB><TAB>next();\n" +
    "<TAB>}\n";

//Returns either 'ObjectDeclaration', 'ModuleExports', or 'Exports'
exports.detectType = function (ast) {
    var moduleExportsEq = findModuleExportsEquals(ast);
    if (moduleExportsEq !== null) {
        return 'ObjectDeclaration';
    }
    var exports = findExports(ast);
    var moduleExports = findModuleExports(ast);

    if (moduleExports.length > exports) {
        return 'ModuleExports';
    } else {
        return 'Exports';
    }
};

exports.getExistingFunctions = function(type, ast) {
    if (type === 'ObjectDeclaration') {
        var modEq = findModuleExportsEquals(ast);
        var objExp = modEq.right;
        var names = [];
        objExp.properties.forEach(function(prop) {
            names.push(prop.key.name);
        });
        return names;
    } else if (type === 'Exports') {
        var names = [];
        findExports(ast).forEach(function(exp) {
            names.push(exp.left.property.name);
        });
        return names;
    } else { //ModuleExports
        var names = [];
        findModuleExports(ast).forEach(function(exp) {
            names.push(exp.left.property.name);
        });
        return names;
    }
};

exports.generateOperation = function(modType, ast, jsPath, props) {
    var file = fs.readFileSync(jsPath).toString();
    props.tab = detectIndent(file).indent || '    ';
    if (modType === 'ObjectDeclaration') {
        var modEq = findModuleExportsEquals(ast);
        if (modEq.right.properties.length === 0) {
            //contains empty assignment, e.g. module.exports = {}
            var start = modEq.right.range[0];
            var end = modEq.right.range[1];
            var top = file.substring(0, end - 1);
            var bottom = file.substring(end - 1);
            file = top + genCode(objDeclarationTemplate, props) + bottom;

        } else {
            //contains at least one assignment
            var start = modEq.right.range[0];
            var end = modEq.right.range[1];
            var top = file.substring(0, end - 1);
            var bottom = file.substring(end - 1);
            top = top.trimRight();
            file = top + ',' + genCode(objDeclarationTemplate, props) + bottom;
        }
    } else {
        //modType is ModuleExports or Exports

        var code = genCode(modType === 'Exports' ? exportTemplate : modExportTemplate, props);
        file = file + code;
    }

    fs.writeFileSync(jsPath, file);
    return file;
};

function genCode(template, props) {
    var toReturn = template;
    _.keys(props).forEach(function(key) {
        var re = new RegExp('<' + key.toUpperCase() + '>', 'g');
        toReturn = toReturn.replace(re, props[key]);
    });

    return toReturn;
}


//find module.exports.foo = function() {}
function findModuleExports(ast) {
    var walk = astw(ast);

    var result = [];
    walk(function (node) {
        if (node.type === 'AssignmentExpression' &&
            node.left.type === 'MemberExpression' &&
            node.left.object.object &&
            node.left.object.object.name === 'module' &&
            node.left.object.property.name === 'exports'
        ) {
            result.push(node);
        }

    });
    return result;
}

//find exports.foo = function() {}
function findExports(ast) {
    var walk = astw(ast);

    var result = [];
    walk(function (node) {
        if (node.type === 'AssignmentExpression' &&
            node.left.type === 'MemberExpression' &&
            node.left.object.name === 'exports'
        ) {
            result.push(node);
        }

    });
    return result;
}

//find  module.exports = {}
function findModuleExportsEquals(ast) {
    var walk = astw(ast);

    var result = null;
    walk(function (node) {
        if (node.type === 'AssignmentExpression' &&
            node.left.type === 'MemberExpression' &&
            node.left.object.name === 'module' &&
            node.left.property.name === 'exports'
        ) {
            result = node;
            return;
        }

    });
    return result;
}
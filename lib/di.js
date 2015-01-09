
//Checks if last parameter is named callback
exports.hasCallback = function(fn) {
    var funStr = fn.toString();
    var params = funStr.slice(funStr.indexOf('(') + 1, funStr.indexOf(')')).match(/([^\s,]+)/g);
    return params !== null && params.indexOf('callback') > -1;
};

//Return an array of the argument names for a function
//If the function has no arguments, [] is returned.
exports.getParamNames =  function(fn) {
    var funStr = fn.toString();
    var toReturn = funStr.slice(funStr.indexOf('(') + 1, funStr.indexOf(')')).match(/([^\s,]+)/g);

    //strip the callback
    if (toReturn === null) {
        return [];
    }
    if (toReturn.length > 0 && toReturn[toReturn.length - 1] === 'callback') {
        toReturn = toReturn.slice(0, toReturn.length - 1);
    }
    return toReturn;
};

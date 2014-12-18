/*
 * Use to calculate the order for performing dependencies
 *
 * Imagine we have a dependency tree
 *     a
 *    / \
 *   c  d
 *   \/ |
 *   e  f
 *
 *  We can create this graph using
 *  addNode('a')
 *  addNode('c', ['a']);
 *  addNode('d', ['a']);
 *  addNode('e', ['c', 'd']);
 *  addNode('f', ['d']);
 *
 *  If we want to execute these nodes, we can parallelize them by grouping them.
 *  The items within each group can safely be executed in parallel before moving on to the next group
 *  [['a'], ['c', 'd'], ['e', 'f']]
 *
 *  which is the output of the calcGroups call.
 */

/*
 * Key is the name of the node
 * value is array of dependencies
 */
var _nodes = {};

module.exports.addNode = function (name, deps) {
    _nodes[name] = deps;
};

module.exports.calcGroups = function () {
    var nodes = _nodes;
    var groups = [];

    //Iterate until we don't have any nodes left to process
    while (Object.keys(nodes).length > 0) {

        //Find the nodes that don't have any dependencies
        var emptyNodes = getNodesWithoutDeps(nodes);

        //If there aren't any, we must have hit a cycle
        if (emptyNodes.length === 0) {
            throw new Error('Cycle found in dependency list: ' + JSON.stringify(nodes))
        }

        //Add all the empty nodes to a group
        groups.push(emptyNodes);

        //remove the empty nodes from all dependency lists
        Object.keys(nodes).forEach(function (key) {
            var val = nodes[key] || [];
            nodes[key] = diffArray(val, emptyNodes);
        });

        //remove the empty nodes from the node list
        for (var key in nodes) {
            if (emptyNodes.indexOf(key) > -1) {
                delete nodes[key];
            }
        }
    }
    return groups;
};

function getNodesWithoutDeps(nodes) {
    var toReturn = [];
    Object.keys(nodes).forEach(function (key) {
        var val = nodes[key];
        if (!val || val.length === 0) {
            toReturn.push(key);
        }
    });
    return toReturn;
}

function diffArray(a, b) {
    return a.filter(function (i) {
        return b.indexOf(i) < 0;
    });
}



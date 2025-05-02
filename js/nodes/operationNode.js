// operationNode.js - Operation node implementation
import { nodes, getNextNodeId } from '../nodeStore.js';
import { createNodeElement, getOperationEndpoints } from './nodeFactory.js';

export function addOperationNode(instance, op) {
    const id = getNextNodeId();
    const nodeType = 'operation';
    const colorClass = 'text-green-600';
    const title = 'Vector Op';

    const content = `
        <div class="font-semibold text-gray-700 text-center">${title}</div>
        <div data-nodeid="${id}" class="node-value-display text-2xl font-bold text-center ${colorClass} my-2 cursor-pointer">${op}</div>
    `;
    const nodeElement = createNodeElement(id, nodeType, content, op);

    instance.draggable(nodeElement, { containment: 'parent' });

    let endpointDefs = getOperationEndpoints(id, op);
    endpointDefs.forEach(def => {
        instance.addEndpoint(id, def.options, def.params);
    });

    nodes[id] = { type: nodeType, operation: op, element: nodeElement, inputs: {}, output: null };
    
    return id;
}
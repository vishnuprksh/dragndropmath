// scalarNode.js - Scalar node implementation
import { nodes, getNextNodeId } from '../nodeStore.js';
import { createNodeElement } from './nodeFactory.js';

export function addScalarNode(instance, isResult = false) {
    const id = getNextNodeId();
    const initialValue = '0'; // Default scalar value
    const nodeTitle = isResult ? 'Result' : 'Scalar';
    const content = `
        <div class="font-semibold text-gray-700 mb-2 text-center">${nodeTitle}</div>
        <input type="text" value="${initialValue}" placeholder="Enter a number" data-nodeid="${id}" readonly
               class="node-value-display w-full p-1 border border-gray-200 rounded text-center text-lg font-mono bg-gray-50"
               onblur="handleInputBlur(this)" onkeydown="handleInputKeydown(event, this)">
    `;
    const nodeElement = createNodeElement(id, 'scalar', content, initialValue, isResult);

    instance.draggable(nodeElement, { containment: 'parent' });

    instance.addEndpoint(id, { uuid: `${id}-in`, anchor: "Left", isTarget: true, maxConnections: 1 });
    instance.addEndpoint(id, { uuid: `${id}-out`, anchor: "Right", isSource: true });

    try {
        nodes[id] = { 
            type: 'scalar', 
            value: parseFloat(initialValue), 
            element: nodeElement, 
            inputs: {}, 
            output: null,
            isAutoResult: isResult
        };
    } catch (e) {
        nodes[id] = { 
            type: 'scalar', 
            value: 0, 
            element: nodeElement, 
            inputs: {}, 
            output: null, 
            error: true,
            isAutoResult: isResult
        };
        console.error("Error parsing initial scalar value:", e);
    }
    
    return id;
}
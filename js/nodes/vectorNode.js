// vectorNode.js - Vector node implementation
import { nodes, getNextNodeId } from '../nodeStore.js';
import { createNodeElement } from './nodeFactory.js';

export function addVectorNode(instance) {
    const id = getNextNodeId();
    const initialDisplayValue = '[0, 0]'; // Default 2D vector
    const content = `
        <div class="font-semibold text-gray-700 mb-2 text-center">Vector</div>
        <input type="text" value="${initialDisplayValue}" placeholder="[x, y]" data-nodeid="${id}" readonly
               class="node-value-display w-full p-1 border border-gray-200 rounded text-center text-lg font-mono bg-gray-50"
               onblur="handleInputBlur(this)" onkeydown="handleInputKeydown(event, this)">
    `;
    const nodeElement = createNodeElement(id, 'vector', content, initialDisplayValue);

    instance.draggable(nodeElement, { containment: 'parent' });

    instance.addEndpoint(id, { uuid: `${id}-in`, anchor: "Left", isTarget: true, maxConnections: 1 });
    instance.addEndpoint(id, { uuid: `${id}-out`, anchor: "Right", isSource: true });

    try {
        nodes[id] = { type: 'vector', value: JSON.parse(initialDisplayValue), element: nodeElement, inputs: {}, output: null };
    } catch (e) {
        nodes[id] = { type: 'vector', value: [0, 0], element: nodeElement, inputs: {}, output: null, error: true };
        console.error("Error parsing initial vector value:", e);
    }
    
    return id;
}
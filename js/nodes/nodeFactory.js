// nodeFactory.js - Common functionality for creating nodes
import { nodes } from '../nodeStore.js';
import { handleNodeDoubleClick } from '../eventHandlers.js';

export function createNodeElement(id, type, content, initialValue = '') {
    const workspace = document.getElementById('workspace');
    const node = document.createElement('div');
    node.id = id;
    node.dataset.value = initialValue;
    const typeClass = `node-${type}`;
    node.className = `node ${typeClass} bg-white p-3 rounded-md shadow-md border border-gray-300 min-w-[150px]`;
    node.innerHTML = content;
    workspace.appendChild(node);
    node.addEventListener('dblclick', handleNodeDoubleClick);

    const nodeCount = Object.keys(nodes).length;
    node.style.left = `${50 + (nodeCount % 5) * 180}px`;
    node.style.top = `${50 + Math.floor(nodeCount / 5) * 120}px`;

    return node;
}

export function getOperationEndpoints(nodeId, op) {
    const baseUuid = `${nodeId}-${op}`;
    return [
        { options: { uuid: `${baseUuid}-in1`, anchor: [0, 0.3, -1, 0], isTarget: true, maxConnections: 1 }, params: {} },
        { options: { uuid: `${baseUuid}-in2`, anchor: [0, 0.7, -1, 0], isTarget: true, maxConnections: 1 }, params: {} },
        { options: { uuid: `${baseUuid}-out`, anchor: "Right", isSource: true, maxConnections: 1 }, params: {} }
    ];
}

export function isValidVector(v) {
    return Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number';
}
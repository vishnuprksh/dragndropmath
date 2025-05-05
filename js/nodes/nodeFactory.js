// nodeFactory.js - Common functionality for creating nodes
import { nodes } from '../nodeStore.js';
import { handleNodeDoubleClick } from '../eventHandlers.js';

export function createNodeElement(id, type, content, initialValue = '', isResult = false) {
    const workspace = document.getElementById('workspace');
    const node = document.createElement('div');
    node.id = id;
    node.dataset.value = initialValue;
    const typeClass = `node-${type}`;
    const resultClass = isResult ? 'node-result' : '';
    node.className = `node ${typeClass} ${resultClass} bg-white p-3 rounded-md shadow-md border border-gray-300 min-w-[150px]`;
    node.innerHTML = content;
    workspace.appendChild(node);
    node.addEventListener('dblclick', handleNodeDoubleClick);

    // Add event listener for node title rename (handled by specific elements)
    setupNodeTitleRename(node);

    const nodeCount = Object.keys(nodes).length;
    node.style.left = `${50 + (nodeCount % 5) * 180}px`;
    node.style.top = `${50 + Math.floor(nodeCount / 5) * 120}px`;

    return node;
}

// Set up event listeners for node title renaming
function setupNodeTitleRename(nodeElement) {
    const titleElement = nodeElement.querySelector('.node-title');
    if (titleElement) {
        titleElement.addEventListener('dblclick', (event) => {
            event.stopPropagation(); // Prevent node modal from opening
            
            // Create an input element to replace the title
            const currentTitle = titleElement.textContent;
            const input = document.createElement('input');
            input.type = 'text';
            input.value = currentTitle;
            input.className = 'w-full text-center font-semibold text-gray-700 mb-2 p-0 border border-blue-400 focus:outline-none';
            
            // Replace the title element with the input
            titleElement.innerHTML = '';
            titleElement.appendChild(input);
            
            // Focus and select the text
            input.focus();
            input.select();
            
            // Handle input blur to save the new title
            input.addEventListener('blur', () => {
                if (input.value.trim() === '') {
                    // Don't allow empty titles
                    titleElement.textContent = currentTitle;
                } else {
                    titleElement.textContent = input.value.trim();
                }
            });
            
            // Handle enter key to save
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    input.blur();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    titleElement.textContent = currentTitle;
                }
            });
        });
    }
}

export function getOperationEndpoints(nodeId, op) {
    const baseUuid = `${nodeId}-${op}`;
    
    // Special case for matrix unary operations that only need one input
    if (op === 'det' || op === 'transpose') {
        return [
            { options: { uuid: `${baseUuid}-in1`, anchor: [0, 0.5, -1, 0], isTarget: true, maxConnections: 1 }, params: {} },
            { options: { uuid: `${baseUuid}-out`, anchor: "Right", isSource: true, maxConnections: 1 }, params: {} }
        ];
    }
    
    // Default for binary operations
    return [
        { options: { uuid: `${baseUuid}-in1`, anchor: [0, 0.3, -1, 0], isTarget: true, maxConnections: 1 }, params: {} },
        { options: { uuid: `${baseUuid}-in2`, anchor: [0, 0.7, -1, 0], isTarget: true, maxConnections: 1 }, params: {} },
        { options: { uuid: `${baseUuid}-out`, anchor: "Right", isSource: true, maxConnections: 1 }, params: {} }
    ];
}

export function isValidVector(v) {
    // Allow scalar values (like outputs from dot product, cross product)
    if (typeof v === 'number') {
        return true;
    }
    
    // Check if it's an array
    if (!Array.isArray(v)) {
        return false;
    }
    
    // Recursive function to validate that all elements are numbers or arrays of numbers
    const validateMatrix = (arr) => {
        if (!Array.isArray(arr)) return typeof arr === 'number';
        return arr.every(item => validateMatrix(item));
    };
    
    // Validate the matrix/vector structure
    return validateMatrix(v);
}
// nodeStore.js - Centralized store for node data
export let nodes = {}; // Store data for all nodes (vectors and operations)
export let nodeCounter = 0;

// Get a new unique node ID
export function getNextNodeId() {
    return `node-${nodeCounter++}`;
}

// Get node value (either calculated or direct)
export function getNodeValue(nodeId) {
    if (!nodes[nodeId]) return null;
    const node = nodes[nodeId];

    if (node.error) return null;

    let inputSourceId = null;
    if (node.type === 'vector') {
        inputSourceId = node.inputs[`${nodeId}-in`];
    }

    if (inputSourceId) {
        return node.calculatedValue !== undefined ? node.calculatedValue : null;
    } else {
        if (node.type === 'vector') {
            return node.value;
        }
    }
    return null;
}

// Update the display for a node
export function updateNodeDisplay(nodeId) {
    const node = nodes[nodeId];
    if (!node || !node.element || node.type !== 'vector') return;

    const inputElement = node.element.querySelector('.node-value-display');
    const hasInputConnection = Object.keys(node.inputs).length > 0;
    let displayValue = '--';

    if (hasInputConnection) {
        const calcValue = node.calculatedValue;
        displayValue = (calcValue !== undefined && calcValue !== null) ? calcValue : '--';
        inputElement.readOnly = true;
        inputElement.classList.add('bg-gray-50');
        inputElement.classList.remove('bg-white', 'border-blue-400', 'border-red-500');
        node.error = false;
    } else {
        displayValue = node.element.dataset.value || '[0, 0]';
        if (inputElement.readOnly) {
            inputElement.classList.add('bg-gray-50');
            inputElement.classList.remove('bg-white', 'border-blue-400');
        }
        if (node.error) {
            inputElement.classList.add('border-red-500');
        } else {
            inputElement.classList.remove('border-red-500');
        }
    }

    try {
        if (node.type === 'vector') {
            // Handle scalar results from dot product and cross product operations
            if (typeof displayValue === 'number') {
                inputElement.value = displayValue.toString();
            } else {
                inputElement.value = (typeof displayValue === 'object' && displayValue !== null)
                    ? JSON.stringify(displayValue)
                    : String(displayValue);
            }
        } else {
            inputElement.value = (typeof displayValue === 'number' || displayValue === '--' || displayValue === '')
                ? displayValue
                : String(displayValue);
        }
    } catch (e) {
        console.error("Error formatting display value for node", nodeId, e);
        inputElement.value = "Error Displaying Value";
    }
}
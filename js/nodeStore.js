// nodeStore.js - Centralized store for node data
// Import the update display functions from vector and matrix nodes
import { updateVectorNodeDisplay } from './nodes/vectorNode.js';
import { updateMatrixNodeDisplay } from './nodes/matrixNode.js';
import { updateScalarNodeDisplay } from './nodes/scalarNode.js';

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
    
    // Check for input connections based on node type
    if (node.type === 'vector' || node.type === 'scalar' || node.type === 'matrix') {
        inputSourceId = node.inputs[`${nodeId}-in`];
    }

    if (inputSourceId) {
        return node.calculatedValue !== undefined ? node.calculatedValue : null;
    } else {
        // Return appropriate value based on node type
        if (node.type === 'vector' || node.type === 'scalar' || node.type === 'matrix') {
            return node.value;
        }
    }
    return null;
}

// Update the display for a node
export function updateNodeDisplay(nodeId) {
    const node = nodes[nodeId];
    if (!node || !node.element) return;
    
    // Only proceed if node is a data type (not an operation)
    if (node.type !== 'vector' && node.type !== 'scalar' && node.type !== 'matrix') return;

    const hasInputConnection = Object.keys(node.inputs).length > 0;
    let displayValue = '--';

    if (hasInputConnection) {
        displayValue = (node.calculatedValue !== undefined && node.calculatedValue !== null) ? node.calculatedValue : '--';
        node.error = false;
    } else {
        // Use the node's direct value
        displayValue = node.value;
    }

    try {
        // Use appropriate display method based on node type
        if (node.type === 'scalar') {
            // Use the new table display for scalars
            updateScalarNodeDisplay(nodeId, displayValue);
        } else if (node.type === 'vector') {
            // Use the new table display for vectors
            updateVectorNodeDisplay(nodeId, displayValue);
        } else if (node.type === 'matrix') {
            // Use the new table display for matrices
            updateMatrixNodeDisplay(nodeId, displayValue);
        }
    } catch (e) {
        console.error("Error updating display value for node", nodeId, e);
        const container = node.element.querySelector('.node-value-display, .vector-container, .matrix-container');
        if (container) {
            if (container.tagName === 'INPUT') {
                container.value = "Error Displaying Value";
            } else {
                container.innerHTML = `<div class="text-red-500 p-2">Error Displaying Value</div>`;
            }
        }
    }
}
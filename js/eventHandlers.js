// eventHandlers.js - Event handling logic for nodes and UI interactions
import { nodes } from './nodeStore.js';
import { evaluateGraph } from './calculator.js';
import { addVectorNode } from './nodes/vectorNode.js';
import { addOperationNode } from './nodes/operationNode.js';

// Track the currently selected node
let selectedNodeId = null;

export function setupEventListeners(instance) {
    const addVectorBtn = document.getElementById('add-vector-btn');
    const operationButtons = document.querySelectorAll('.op-btn');
    const workspace = document.getElementById('workspace');

    // Add event listeners for buttons
    addVectorBtn.addEventListener('click', () => addVectorNode(instance));

    operationButtons.forEach(button => {
        button.addEventListener('click', () => {
            const op = button.getAttribute('data-op');
            addOperationNode(instance, op);
        });
    });

    // Add keyboard event listener to handle deletion
    document.addEventListener('keydown', (event) => {
        if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNodeId && 
            !event.target.matches('input, textarea')) {
            deleteNode(selectedNodeId, instance);
            event.preventDefault();
        }
    });

    // Add click event listener to workspace to handle node selection
    workspace.addEventListener('click', (event) => {
        const nodeElement = event.target.closest('.node');
        
        // Deselect any previously selected node
        if (selectedNodeId) {
            const previousSelectedNode = document.getElementById(selectedNodeId);
            if (previousSelectedNode) {
                previousSelectedNode.classList.remove('node-selected');
            }
        }
        
        // Select the clicked node
        if (nodeElement) {
            selectedNodeId = nodeElement.id;
            nodeElement.classList.add('node-selected');
        } else {
            // If clicked on workspace (not on a node), deselect
            selectedNodeId = null;
        }
    });

    // Add global handlers for input blurring and keydown events
    window.handleInputBlur = (inputElement) => {
        inputElement.readOnly = true;
        const nodeElement = inputElement.closest('.node');
        if (!nodeElement) return;
        const node = nodes[nodeElement.id];

        if (node && node.type === 'vector') {
            inputElement.classList.add('bg-gray-50');
            inputElement.classList.remove('bg-white', 'border-blue-400');
        }
        updateNodeValue(inputElement);
    };

    window.handleInputKeydown = (event, inputElement) => {
        const nodeElement = inputElement.closest('.node');
        if (!nodeElement) return;
        const node = nodes[nodeElement.id];

        if (event.key === 'Enter') {
            event.preventDefault();
            inputElement.blur();
        } else if (event.key === 'Escape') {
            if (node) {
                inputElement.value = node.element.dataset.value || '[0, 0]';
            }
            inputElement.blur();
        }
    };
}

// Delete a node and its connections
export function deleteNode(nodeId, instance) {
    if (!nodes[nodeId]) return;
    
    const node = nodes[nodeId];
    console.log(`Deleting node: ${nodeId}`);
    
    // Remove all connections to/from the node
    instance.deleteConnectionsForElement(nodeId);
    
    // Remove all endpoints associated with the node
    instance.removeAllEndpoints(nodeId);
    
    // Update connections in other nodes that reference this node
    Object.keys(nodes).forEach(id => {
        if (nodes[id].output === nodeId) {
            nodes[id].output = null;
        }
        
        // Remove any input references to the deleted node
        Object.keys(nodes[id].inputs).forEach(inputKey => {
            if (nodes[id].inputs[inputKey] === nodeId) {
                delete nodes[id].inputs[inputKey];
            }
        });
    });
    
    // Remove the node element from the DOM
    if (node.element && node.element.parentNode) {
        node.element.parentNode.removeChild(node.element);
    }
    
    // Remove the node from our nodes data structure
    delete nodes[nodeId];
    
    // Reset selected node
    selectedNodeId = null;
    
    // Re-evaluate the graph
    evaluateGraph();
}

// Handle double-clicking on nodes
export function handleNodeDoubleClick(event) {
    const target = event.target;
    const nodeElement = target.closest('.node');
    if (!nodeElement) return;
    const nodeId = nodeElement.id;

    if (!nodeId || !nodes[nodeId]) return;
    const node = nodes[nodeId];

    if (node.type === 'vector') {
        const inputSourceId = node.inputs[`${nodeId}-in`];
        if (!inputSourceId) {
            const inputElement = node.element.querySelector('.node-value-display');
            inputElement.readOnly = false;
            inputElement.classList.remove('bg-gray-50');
            inputElement.classList.add('bg-white', 'border-blue-400');
            inputElement.focus();
            inputElement.select();
        } else {
            console.log("Cannot edit Vector node when it's receiving input.");
        }
    } else if (node.type === 'operation') {
        if (target.classList.contains('node-value-display') || target.closest('.node-value-display')) {
            const currentOp = node.operation;
            let promptText = `Change operation (current: ${currentOp}):\n`;
            let validOps = ['+', '-', '*', '/'];
            promptText += 'Enter +, -, *, or /';

            const newOp = prompt(promptText, currentOp);

            if (newOp && validOps.includes(newOp) && newOp !== currentOp) {
                console.warn("Changing operation type might require manual reconnection if endpoint structure differs.");
                node.operation = newOp;
                node.element.dataset.value = newOp;
                const displayElement = node.element.querySelector('.node-value-display');
                displayElement.textContent = newOp;
                console.log(`Operation node ${nodeId} changed to ${newOp}`);
                evaluateGraph();
            } else if (newOp && !validOps.includes(newOp)) {
                alert(`Invalid operation. Please enter one of: ${validOps.join(', ')}.`);
            }
        }
    }
}

// Update node value when input changes
export function updateNodeValue(inputElement) {
    const nodeId = inputElement.closest('.node')?.id;
    if (!nodeId || !nodes[nodeId]) return;

    const node = nodes[nodeId];
    const valueStr = inputElement.value.trim();

    if (node.type === 'vector') {
        try {
            if (valueStr === '') throw new Error("Input cannot be empty.");

            const newValue = JSON.parse(valueStr);
            if (!Array.isArray(newValue) || newValue.length !== 2 || typeof newValue[0] !== 'number' || typeof newValue[1] !== 'number') {
                throw new Error("Input must be a valid 2D vector like [x, y].");
            }

            if (JSON.stringify(node.value) !== JSON.stringify(newValue)) {
                node.value = newValue;
                node.element.dataset.value = valueStr;
                node.error = false;
                console.log(`Vector node ${nodeId} value set to`, newValue);
                evaluateGraph();
            }
            inputElement.classList.remove('border-red-500');
        } catch (e) {
            console.error(`Invalid vector input for node ${nodeId}:`, e.message);
            inputElement.classList.add('border-red-500');
            node.error = true;
        }
    }
}
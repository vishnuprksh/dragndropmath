// eventHandlers.js - Event handling logic for nodes and UI interactions
import { nodes } from './nodeStore.js';
import { evaluateGraph } from './calculator.js';
import { addVectorNode } from './nodes/vectorNode.js';
import { addOperationNode } from './nodes/operationNode.js';

// Track the currently selected node
let selectedNodeId = null;
// Track the node being edited in the modal
let editingNodeId = null;

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

    // Set up the edit modal
    setupEditModal(instance);
}

// Set up all event handlers for the edit modal
function setupEditModal(instance) {
    const modal = document.getElementById('edit-node-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-edit');
    const saveBtn = document.getElementById('save-edit');
    const vectorForm = document.getElementById('vector-edit-form');
    const operationForm = document.getElementById('operation-edit-form');
    const vectorInput = document.getElementById('vector-value-input');
    const vectorError = document.getElementById('vector-input-error');
    const operationBtns = document.querySelectorAll('.modal-op-btn');
    
    // Close modal when clicking close button
    closeModalBtn.addEventListener('click', () => hideModal());
    
    // Close modal when clicking cancel button 
    cancelBtn.addEventListener('click', () => hideModal());
    
    // Close modal when clicking outside the modal content
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            hideModal();
        }
    });
    
    // Handle escape key to close modal
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
            hideModal();
        }
    });
    
    // Handle selected operation in modal
    operationBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove selected class from all buttons
            operationBtns.forEach(b => b.classList.remove('selected'));
            // Add selected class to clicked button
            btn.classList.add('selected');
        });
    });
    
    // Handle save button click
    saveBtn.addEventListener('click', () => {
        saveNodeChanges(instance);
    });
    
    // Handle enter key in vector input
    vectorInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            saveNodeChanges(instance);
        }
    });
}

// Show modal for editing a node
function showModal(nodeId) {
    const modal = document.getElementById('edit-node-modal');
    const vectorForm = document.getElementById('vector-edit-form');
    const operationForm = document.getElementById('operation-edit-form');
    const vectorInput = document.getElementById('vector-value-input');
    const vectorError = document.getElementById('vector-input-error');
    const modalTitle = document.getElementById('modal-title');
    const operationBtns = document.querySelectorAll('.modal-op-btn');
    
    editingNodeId = nodeId;
    const node = nodes[nodeId];
    
    // Reset forms
    vectorForm.classList.add('hidden');
    operationForm.classList.add('hidden');
    vectorError.classList.add('hidden');
    operationBtns.forEach(btn => btn.classList.remove('selected'));
    
    // Set up the modal based on node type
    if (node.type === 'vector') {
        modalTitle.textContent = 'Edit Vector';
        vectorForm.classList.remove('hidden');
        vectorInput.value = node.element.dataset.value || JSON.stringify(node.value);
        
        // Check if this node has inputs (can't edit if it has)
        const inputSourceId = node.inputs[`${nodeId}-in`];
        if (inputSourceId) {
            vectorInput.disabled = true;
            vectorInput.classList.add('bg-gray-100');
            vectorError.textContent = "This vector is receiving input and cannot be edited directly.";
            vectorError.classList.remove('hidden');
        } else {
            vectorInput.disabled = false;
            vectorInput.classList.remove('bg-gray-100');
        }
    } else if (node.type === 'operation') {
        modalTitle.textContent = 'Edit Operation';
        operationForm.classList.remove('hidden');
        
        // Select the current operation
        const currentOp = node.operation;
        const currentOpBtn = document.querySelector(`.modal-op-btn[data-op="${currentOp}"]`);
        if (currentOpBtn) {
            currentOpBtn.classList.add('selected');
        }
    }
    
    // Show the modal with animation
    modal.classList.remove('hidden');
    // Use setTimeout to ensure the browser processes the display change before adding the show class
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    // Focus the input if it's a vector
    if (node.type === 'vector' && !vectorInput.disabled) {
        setTimeout(() => {
            vectorInput.focus();
            vectorInput.select();
        }, 100);
    }
}

// Hide the modal
function hideModal() {
    const modal = document.getElementById('edit-node-modal');
    modal.classList.remove('show');
    
    // Wait for animation to complete before hiding
    setTimeout(() => {
        modal.classList.add('hidden');
        editingNodeId = null;
    }, 200);
}

// Save changes made in the modal
function saveNodeChanges(instance) {
    if (!editingNodeId || !nodes[editingNodeId]) return;
    
    const node = nodes[editingNodeId];
    const vectorInput = document.getElementById('vector-value-input');
    const vectorError = document.getElementById('vector-input-error');
    
    if (node.type === 'vector') {
        const valueStr = vectorInput.value.trim();
        
        try {
            if (valueStr === '') throw new Error("Input cannot be empty.");

            // Support both scalar values (numbers) and matrices/vectors of any dimension
            let newValue;
            if (/^-?\d+(\.\d+)?$/.test(valueStr)) {
                // This is a scalar number
                newValue = parseFloat(valueStr);
            } else {
                // Try parsing as a matrix/vector
                newValue = JSON.parse(valueStr);
                
                // Validate if it's a valid matrix/vector (array of numbers or array of arrays of numbers)
                if (!Array.isArray(newValue)) {
                    throw new Error("Input must be a valid matrix/vector (array) or a single number.");
                }
                
                // Recursive function to validate that all elements are numbers or arrays of numbers
                const validateMatrix = (arr) => {
                    if (!Array.isArray(arr)) return typeof arr === 'number';
                    return arr.every(item => validateMatrix(item));
                };
                
                if (!validateMatrix(newValue)) {
                    throw new Error("Matrix/vector must contain only numbers or arrays of numbers.");
                }
            }

            if (JSON.stringify(node.value) !== JSON.stringify(newValue)) {
                node.value = newValue;
                node.element.dataset.value = valueStr;
                const displayElement = node.element.querySelector('.node-value-display');
                displayElement.value = valueStr;
                node.error = false;
                console.log(`Vector node ${editingNodeId} value set to`, newValue);
                evaluateGraph();
            }
            
            hideModal();
        } catch (e) {
            console.error(`Invalid matrix/vector input:`, e.message);
            vectorError.textContent = e.message;
            vectorError.classList.remove('hidden');
        }
    } else if (node.type === 'operation') {
        const selectedOpBtn = document.querySelector('.modal-op-btn.selected');
        if (selectedOpBtn) {
            const newOp = selectedOpBtn.getAttribute('data-op');
            
            if (newOp && newOp !== node.operation) {
                console.warn("Changing operation type might require manual reconnection if endpoint structure differs.");
                
                // Store previous endpoints for potential cleanup
                const oldEndpoints = instance.getEndpoints(editingNodeId);
                
                // Update the node's operation
                node.operation = newOp;
                node.element.dataset.value = newOp;
                const displayElement = node.element.querySelector('.node-value-display');
                displayElement.textContent = newOp;
                
                // You might need additional logic here to handle the jsPlumb endpoints
                // if your operations have different numbers of inputs
                
                console.log(`Operation node ${editingNodeId} changed to ${newOp}`);
                evaluateGraph();
            }
            
            hideModal();
        }
    }
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

    // Show the edit modal for the node
    showModal(nodeId);
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

            // Support both scalar values (numbers) and matrices/vectors of any dimension
            let newValue;
            if (/^-?\d+(\.\d+)?$/.test(valueStr)) {
                // This is a scalar number
                newValue = parseFloat(valueStr);
            } else {
                // Try parsing as a matrix/vector
                newValue = JSON.parse(valueStr);
                
                // Validate if it's a valid matrix/vector (array of numbers or array of arrays of numbers)
                if (!Array.isArray(newValue)) {
                    throw new Error("Input must be a valid matrix/vector (array) or a single number.");
                }
                
                // Recursive function to validate that all elements are numbers or arrays of numbers
                const validateMatrix = (arr) => {
                    if (!Array.isArray(arr)) return typeof arr === 'number';
                    return arr.every(item => validateMatrix(item));
                };
                
                if (!validateMatrix(newValue)) {
                    throw new Error("Matrix/vector must contain only numbers or arrays of numbers.");
                }
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
            console.error(`Invalid matrix/vector input for node ${nodeId}:`, e.message);
            inputElement.classList.add('border-red-500');
            node.error = true;
        }
    }
}
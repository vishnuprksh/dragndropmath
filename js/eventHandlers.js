// eventHandlers.js - Event handling logic for nodes and UI interactions
import { nodes } from './nodeStore.js';
import { evaluateGraph } from './calculator.js';
import { addVectorNode } from './nodes/vectorNode.js';
import { addScalarNode } from './nodes/scalarNode.js';
import { addMatrixNode } from './nodes/matrixNode.js';
import { addOperationNode, getAvailableOperations } from './nodes/operationNode.js';

// Track the currently selected node
let selectedNodeId = null;
// Track the node being edited in the modal
let editingNodeId = null;
// Track current operation type
let currentNodeType = 'vector';

export function setupEventListeners(instance) {
    const addVectorBtn = document.getElementById('add-vector-btn');
    const addScalarBtn = document.getElementById('add-scalar-btn');
    const addMatrixBtn = document.getElementById('add-matrix-btn');
    const operationButtons = document.querySelectorAll('.op-btn');
    const nodeTypeButtons = document.querySelectorAll('.node-type-btn');
    const workspace = document.getElementById('workspace');

    // Add event listeners for node buttons
    addVectorBtn.addEventListener('click', () => addVectorNode(instance));
    addScalarBtn.addEventListener('click', () => addScalarNode(instance));
    addMatrixBtn.addEventListener('click', () => addMatrixNode(instance));

    // Add event listeners for node type selection buttons
    nodeTypeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const nodeType = button.getAttribute('data-type');
            
            // Update current node type
            currentNodeType = nodeType;
            
            // Update UI to show active state
            nodeTypeButtons.forEach(btn => {
                btn.classList.remove('active-type');
            });
            button.classList.add('active-type');
            
            // Update operation buttons based on node type
            updateOperationButtons(nodeType);
        });
    });

    // Add event listeners for operation buttons
    operationButtons.forEach(button => {
        button.addEventListener('click', () => {
            const op = button.getAttribute('data-op');
            addOperationNode(instance, op, currentNodeType);
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

        if (node && (node.type === 'vector' || node.type === 'scalar' || node.type === 'matrix')) {
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
                inputElement.value = node.element.dataset.value || 
                    (node.type === 'scalar' ? '0' : 
                    (node.type === 'vector' ? '[0, 0]' : '[[1, 0], [0, 1]]'));
            }
            inputElement.blur();
        }
    };

    // Handle scalar cell editing events
    window.handleScalarCellBlur = function(input) {
        if (!input.readOnly) {
            const nodeId = input.dataset.nodeid;
            updateScalarCell(input, nodeId);
        }
    };

    // Handle vector cell editing events
    window.handleVectorCellBlur = function(input) {
        if (!input.readOnly) {
            const nodeId = input.dataset.nodeid;
            updateVectorCell(input, nodeId);
        }
    };

    // Handle matrix cell editing events
    window.handleMatrixCellBlur = function(input) {
        if (!input.readOnly) {
            const nodeId = input.dataset.nodeid;
            updateMatrixCell(input, nodeId);
        }
    };

    // Handle cell keydown events (for all cell types)
    window.handleCellKeydown = function(event, input) {
        if (input.readOnly) return;
        
        if (event.key === 'Enter') {
            event.preventDefault();
            if (input.classList.contains('vector-cell')) {
                updateVectorCell(input, input.dataset.nodeid);
            } else if (input.classList.contains('matrix-cell')) {
                updateMatrixCell(input, input.dataset.nodeid);
            } else if (input.classList.contains('scalar-cell')) {
                updateScalarCell(input, input.dataset.nodeid);
            }
            input.blur();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            // Reset to original value
            const nodeId = input.dataset.nodeid;
            const node = nodes[nodeId];
            
            if (input.classList.contains('vector-cell')) {
                const index = parseInt(input.dataset.index);
                input.value = node.value[index];
            } else if (input.classList.contains('matrix-cell')) {
                const row = parseInt(input.dataset.row);
                const col = parseInt(input.dataset.col);
                input.value = node.value[row][col];
            } else if (input.classList.contains('scalar-cell')) {
                input.value = node.value.toString();
            }
            
            input.readOnly = true;
            input.classList.remove('bg-white', 'border-green-400', 'border-purple-400', 'border-blue-400');
            input.blur();
        }
    };

    // Set up the edit modal
    setupEditModal(instance);
    
    // Initialize operation buttons with default node type (vector)
    updateOperationButtons(currentNodeType);
}

// Update operation buttons based on the selected node type
function updateOperationButtons(nodeType) {
    const operationButtons = document.querySelectorAll('.op-btn');
    const availableOps = getAvailableOperations(nodeType);
    
    operationButtons.forEach(button => {
        const op = button.getAttribute('data-op');
        const buttonOpType = button.classList.contains('scalar-op') ? 'scalar' : 
                             button.classList.contains('vector-op') ? 'vector' : 
                             button.classList.contains('matrix-op') ? 'matrix' : '';
        
        // Hide all buttons first
        button.style.display = 'none';
        
        // Only show buttons matching current operation type AND in the available operations list
        if (availableOps.includes(op) && (buttonOpType === nodeType || buttonOpType === '')) {
            button.style.display = '';
            
            // Update classes based on node type
            button.classList.remove('scalar-op', 'vector-op', 'matrix-op');
            button.classList.add(`${nodeType}-op`);
        }
    });
}

// Set up all event handlers for the edit modal
function setupEditModal(instance) {
    const modal = document.getElementById('edit-node-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-edit');
    const saveBtn = document.getElementById('save-edit');
    const vectorForm = document.getElementById('vector-edit-form');
    const scalarForm = document.getElementById('scalar-edit-form');
    const matrixForm = document.getElementById('matrix-edit-form');
    const operationForm = document.getElementById('operation-edit-form');
    const vectorInput = document.getElementById('vector-value-input');
    const scalarInput = document.getElementById('scalar-value-input');
    const matrixInput = document.getElementById('matrix-value-input');
    const inputError = document.getElementById('vector-input-error');
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
    
    // Handle enter key in input fields
    vectorInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            saveNodeChanges(instance);
        }
    });
    
    scalarInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            saveNodeChanges(instance);
        }
    });
    
    matrixInput.addEventListener('keydown', (event) => {
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
    const scalarForm = document.getElementById('scalar-edit-form');
    const matrixForm = document.getElementById('matrix-edit-form');
    const operationForm = document.getElementById('operation-edit-form');
    const vectorInput = document.getElementById('vector-value-input');
    const scalarInput = document.getElementById('scalar-value-input');
    const matrixInput = document.getElementById('matrix-value-input');
    const inputError = document.getElementById('vector-input-error');
    const modalTitle = document.getElementById('modal-title');
    const operationBtns = document.querySelectorAll('.modal-op-btn');
    
    editingNodeId = nodeId;
    const node = nodes[nodeId];
    
    // Reset forms
    vectorForm.classList.add('hidden');
    scalarForm.classList.add('hidden');
    matrixForm.classList.add('hidden');
    operationForm.classList.add('hidden');
    inputError.classList.add('hidden');
    operationBtns.forEach(btn => btn.classList.remove('selected'));
    
    // Set up the modal based on node type
    if (node.type === 'scalar') {
        modalTitle.textContent = 'Edit Scalar';
        scalarForm.classList.remove('hidden');
        scalarInput.value = node.element.dataset.value || node.value.toString();
        
        // Check if this node has inputs (can't edit if it has)
        const inputSourceId = node.inputs[`${nodeId}-in`];
        if (inputSourceId) {
            scalarInput.disabled = true;
            scalarInput.classList.add('bg-gray-100');
            inputError.textContent = "This scalar is receiving input and cannot be edited directly.";
            inputError.classList.remove('hidden');
        } else {
            scalarInput.disabled = false;
            scalarInput.classList.remove('bg-gray-100');
        }
        
        // Focus after setup
        setTimeout(() => {
            if (!scalarInput.disabled) {
                scalarInput.focus();
                scalarInput.select();
            }
        }, 100);
    } else if (node.type === 'vector') {
        modalTitle.textContent = 'Edit Vector';
        vectorForm.classList.remove('hidden');
        vectorInput.value = node.element.dataset.value || JSON.stringify(node.value);
        
        // Check if this node has inputs (can't edit if it has)
        const inputSourceId = node.inputs[`${nodeId}-in`];
        if (inputSourceId) {
            vectorInput.disabled = true;
            vectorInput.classList.add('bg-gray-100');
            inputError.textContent = "This vector is receiving input and cannot be edited directly.";
            inputError.classList.remove('hidden');
        } else {
            vectorInput.disabled = false;
            vectorInput.classList.remove('bg-gray-100');
        }
        
        // Focus after setup
        setTimeout(() => {
            if (!vectorInput.disabled) {
                vectorInput.focus();
                vectorInput.select();
            }
        }, 100);
    } else if (node.type === 'matrix') {
        modalTitle.textContent = 'Edit Matrix';
        matrixForm.classList.remove('hidden');
        matrixInput.value = node.element.dataset.value || JSON.stringify(node.value);
        
        // Check if this node has inputs (can't edit if it has)
        const inputSourceId = node.inputs[`${nodeId}-in`];
        if (inputSourceId) {
            matrixInput.disabled = true;
            matrixInput.classList.add('bg-gray-100');
            inputError.textContent = "This matrix is receiving input and cannot be edited directly.";
            inputError.classList.remove('hidden');
        } else {
            matrixInput.disabled = false;
            matrixInput.classList.remove('bg-gray-100');
        }
        
        // Focus after setup
        setTimeout(() => {
            if (!matrixInput.disabled) {
                matrixInput.focus();
                matrixInput.select();
            }
        }, 100);
    } else if (node.type === 'operation') {
        modalTitle.textContent = 'Edit Operation';
        operationForm.classList.remove('hidden');
        
        // Select the current operation
        const currentOp = node.operation;
        const currentOpBtn = document.querySelector(`.modal-op-btn[data-op="${currentOp}"]`);
        if (currentOpBtn) {
            currentOpBtn.classList.add('selected');
        }
        
        // Filter operation buttons based on node's operation type
        operationBtns.forEach(button => {
            const op = button.getAttribute('data-op');
            const availableOps = getAvailableOperations(node.operationFor || 'vector');
            
            if (availableOps.includes(op)) {
                button.style.display = '';
            } else {
                button.style.display = 'none';
            }
        });
    }
    
    // Show the modal with animation
    modal.classList.remove('hidden');
    // Use setTimeout to ensure the browser processes the display change before adding the show class
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
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
    const scalarInput = document.getElementById('scalar-value-input');
    const matrixInput = document.getElementById('matrix-value-input');
    const inputError = document.getElementById('vector-input-error');
    
    if (node.type === 'scalar') {
        const valueStr = scalarInput.value.trim();
        
        try {
            if (valueStr === '') throw new Error("Input cannot be empty.");
            
            // Parse the scalar value
            if (!/^-?\d+(\.\d+)?$/.test(valueStr)) {
                throw new Error("Scalar must be a valid number.");
            }
            
            const newValue = parseFloat(valueStr);
            
            if (node.value !== newValue) {
                node.value = newValue;
                node.element.dataset.value = valueStr;
                
                // Fix: Use the correct selector for scalar nodes
                const scalarCell = node.element.querySelector('.scalar-cell');
                if (scalarCell) {
                    scalarCell.value = valueStr;
                } else {
                    // Fallback to node-value-display if it exists
                    const displayElement = node.element.querySelector('.node-value-display');
                    if (displayElement) {
                        displayElement.value = valueStr;
                    }
                }
                
                node.error = false;
                console.log(`Scalar node ${editingNodeId} value set to`, newValue);
                evaluateGraph();
            }
            
            hideModal();
        } catch (e) {
            console.error(`Invalid scalar input:`, e.message);
            inputError.textContent = e.message;
            inputError.classList.remove('hidden');
        }
    } else if (node.type === 'vector') {
        const valueStr = vectorInput.value.trim();
        
        try {
            if (valueStr === '') throw new Error("Input cannot be empty.");

            // Support both scalar values (numbers) and vectors
            let newValue;
            if (/^-?\d+(\.\d+)?$/.test(valueStr)) {
                // This is a scalar number
                newValue = parseFloat(valueStr);
            } else {
                // Try parsing as a vector
                newValue = JSON.parse(valueStr);
                
                // Validate if it's a valid vector (array of numbers)
                if (!Array.isArray(newValue)) {
                    throw new Error("Input must be a valid vector (array) or a single number.");
                }
                
                // Validate that all elements are numbers
                if (!newValue.every(item => typeof item === 'number')) {
                    throw new Error("Vector must contain only numbers.");
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
            console.error(`Invalid vector input:`, e.message);
            inputError.textContent = e.message;
            inputError.classList.remove('hidden');
        }
    } else if (node.type === 'matrix') {
        const valueStr = matrixInput.value.trim();
        
        try {
            if (valueStr === '') throw new Error("Input cannot be empty.");

            // Parse matrix value
            const newValue = JSON.parse(valueStr);
            
            // Validate if it's a valid matrix (array of arrays of numbers)
            if (!Array.isArray(newValue) || !newValue.every(row => Array.isArray(row))) {
                throw new Error("Input must be a valid matrix (array of arrays).");
            }
            
            // Validate that all elements are numbers
            if (!newValue.every(row => row.every(item => typeof item === 'number'))) {
                throw new Error("Matrix must contain only numbers.");
            }
            
            // Validate that all rows have the same length
            const rowLength = newValue[0].length;
            if (!newValue.every(row => row.length === rowLength)) {
                throw new Error("All rows in the matrix must have the same length.");
            }

            if (JSON.stringify(node.value) !== JSON.stringify(newValue)) {
                node.value = newValue;
                node.element.dataset.value = valueStr;
                const displayElement = node.element.querySelector('.node-value-display');
                displayElement.value = valueStr;
                node.error = false;
                console.log(`Matrix node ${editingNodeId} value set to`, newValue);
                evaluateGraph();
            }
            
            hideModal();
        } catch (e) {
            console.error(`Invalid matrix input:`, e.message);
            inputError.textContent = e.message;
            inputError.classList.remove('hidden');
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

    if (node.type === 'scalar') {
        try {
            if (valueStr === '') throw new Error("Input cannot be empty.");
            
            // Parse the scalar value
            if (!/^-?\d+(\.\d+)?$/.test(valueStr)) {
                throw new Error("Scalar must be a valid number.");
            }
            
            const newValue = parseFloat(valueStr);
            
            if (node.value !== newValue) {
                node.value = newValue;
                node.element.dataset.value = valueStr;
                
                // Fix: Use the correct selector for scalar nodes
                const scalarCell = node.element.querySelector('.scalar-cell');
                if (scalarCell) {
                    scalarCell.value = valueStr;
                } else {
                    // Fallback to node-value-display if it exists
                    const displayElement = node.element.querySelector('.node-value-display');
                    if (displayElement) {
                        displayElement.value = valueStr;
                    }
                }
                
                node.error = false;
                console.log(`Scalar node ${nodeId} value set to`, newValue);
                evaluateGraph();
            }
            inputElement.classList.remove('border-red-500');
        } catch (e) {
            console.error(`Invalid scalar input for node ${nodeId}:`, e.message);
            inputElement.classList.add('border-red-500');
            node.error = true;
        }
    } else if (node.type === 'vector') {
        try {
            if (valueStr === '') throw new Error("Input cannot be empty.");

            // Support both scalar values (numbers) and vectors
            let newValue;
            if (/^-?\d+(\.\d+)?$/.test(valueStr)) {
                // This is a scalar number
                newValue = parseFloat(valueStr);
            } else {
                // Try parsing as a vector
                newValue = JSON.parse(valueStr);
                
                // Validate if it's a valid vector (array of numbers)
                if (!Array.isArray(newValue)) {
                    throw new Error("Input must be a valid vector (array) or a single number.");
                }
                
                // Validate that all elements are numbers
                if (!newValue.every(item => typeof item === 'number')) {
                    throw new Error("Vector must contain only numbers.");
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
            console.error(`Invalid vector input for node ${nodeId}:`, e.message);
            inputElement.classList.add('border-red-500');
            node.error = true;
        }
    } else if (node.type === 'matrix') {
        try {
            if (valueStr === '') throw new Error("Input cannot be empty.");

            // Parse matrix value
            const newValue = JSON.parse(valueStr);
            
            // Validate if it's a valid matrix (array of arrays of numbers)
            if (!Array.isArray(newValue) || !newValue.every(row => Array.isArray(row))) {
                throw new Error("Input must be a valid matrix (array of arrays).");
            }
            
            // Validate that all elements are numbers
            if (!newValue.every(row => row.every(item => typeof item === 'number'))) {
                throw new Error("Matrix must contain only numbers.");
            }
            
            // Validate that all rows have the same length
            const rowLength = newValue[0].length;
            if (!newValue.every(row => row.length === rowLength)) {
                throw new Error("All rows in the matrix must have the same length.");
            }

            if (JSON.stringify(node.value) !== JSON.stringify(newValue)) {
                node.value = newValue;
                node.element.dataset.value = valueStr;
                node.error = false;
                console.log(`Matrix node ${nodeId} value set to`, newValue);
                evaluateGraph();
            }
            inputElement.classList.remove('border-red-500');
        } catch (e) {
            console.error(`Invalid matrix input for node ${nodeId}:`, e.message);
            inputElement.classList.add('border-red-500');
            node.error = true;
        }
    }
}
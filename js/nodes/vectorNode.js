// vectorNode.js - Vector node implementation
import { nodes, getNextNodeId } from '../nodeStore.js';
import { createNodeElement } from './nodeFactory.js';

export function addVectorNode(instance, isResult = false) {
    const id = getNextNodeId();
    const initialValue = [1, 1]; // Changed from [0, 0] to [1, 1]
    const initialDisplayValue = JSON.stringify(initialValue);
    const nodeTitle = isResult ? 'Result' : 'Vector';
    
    // Create HTML table for vector display
    const tableHTML = createVectorTableHTML(id, initialValue);
    
    const content = `
        <div class="font-semibold text-gray-700 mb-2 text-center node-title" title="Double-click to rename">${nodeTitle}</div>
        <div class="vector-container" data-nodeid="${id}" data-value='${initialDisplayValue}'>
            ${tableHTML}
        </div>
        <div class="flex justify-between mt-2">
            <button class="resize-vector-btn text-xs px-2 py-1 bg-green-200 hover:bg-green-300 rounded" data-action="resize" data-nodeid="${id}">
                Resize
            </button>
            <div class="vector-dimensions text-xs text-gray-500">${initialValue.length}×1</div>
        </div>
    `;
    
    const nodeElement = createNodeElement(id, 'vector', content, initialDisplayValue, isResult);

    instance.draggable(nodeElement, { containment: 'parent' });

    instance.addEndpoint(id, { uuid: `${id}-in`, anchor: "Left", isTarget: true, maxConnections: 1 });
    instance.addEndpoint(id, { uuid: `${id}-out`, anchor: "Right", isSource: true });

    try {
        nodes[id] = { 
            type: 'vector', 
            value: initialValue, 
            element: nodeElement, 
            inputs: {}, 
            output: null,
            isAutoResult: isResult
        };
    } catch (e) {
        nodes[id] = { 
            type: 'vector', 
            value: [0, 0], 
            element: nodeElement, 
            inputs: {}, 
            output: null, 
            error: true,
            isAutoResult: isResult
        };
        console.error("Error parsing initial vector value:", e);
    }
    
    // Add event listener for vector cells
    setupVectorEvents(nodeElement, id);
    
    return id;
}

// Create an HTML table for the vector
function createVectorTableHTML(nodeId, vectorData) {
    let html = `<table class="vector-table w-full border-collapse">`;
    
    // For column vector display (vertical orientation)
    for (let i = 0; i < vectorData.length; i++) {
        html += `<tr>
            <td class="border border-gray-300 p-0">
                <input type="text" 
                       value="${vectorData[i]}" 
                       data-index="${i}" 
                       data-nodeid="${nodeId}"
                       class="vector-cell w-full h-full p-1 text-center text-sm"
                       readonly>
            </td>
        </tr>`;
    }
    
    html += `</table>`;
    return html;
}

// Set up event listeners for vector table cells
function setupVectorEvents(nodeElement, nodeId) {
    // Event delegation for vector cell editing (single click instead of double click)
    nodeElement.addEventListener('click', (event) => {
        const cell = event.target.closest('.vector-cell');
        if (!cell) return;
        
        // Check if node is connected to an input
        const node = nodes[nodeId];
        if (!node || Object.keys(node.inputs).length > 0) return;
        
        // Only proceed if the cell isn't already being edited
        if (!cell.readOnly) return;
        
        cell.readOnly = false;
        cell.classList.add('bg-white', 'border-green-400');
        cell.focus();
        cell.select();
    });
    
    // Handle resize button click
    const resizeBtn = nodeElement.querySelector('.resize-vector-btn');
    if (resizeBtn) {
        resizeBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            showVectorResizeModal(nodeId);
        });
    }
}

// Update vector node after cell edit
function updateVectorCell(input, nodeId) {
    const node = nodes[nodeId];
    if (!node) return;
    
    const index = parseInt(input.dataset.index);
    
    try {
        const value = parseFloat(input.value);
        if (isNaN(value)) throw new Error("Vector element must be a number");
        
        // Update the vector value
        node.value[index] = value;
        node.element.querySelector('.vector-container').dataset.value = JSON.stringify(node.value);
        
        // Restore cell display
        input.readOnly = true;
        input.classList.remove('bg-white', 'border-green-400');
        
        // Re-evaluate graph
        if (typeof evaluateGraph === 'function') {
            evaluateGraph();
        }
    } catch (e) {
        console.error("Invalid vector cell value:", e);
        input.classList.add('border-red-500');
        setTimeout(() => {
            input.classList.remove('border-red-500');
            input.value = node.value[index];
            input.readOnly = true;
            input.classList.remove('bg-white', 'border-green-400');
        }, 1000);
    }
}

// Show modal dialog for resizing vector
function showVectorResizeModal(nodeId) {
    const node = nodes[nodeId];
    if (!node) return;
    
    // Check if node is connected to an input
    if (Object.keys(node.inputs).length > 0) {
        alert("Cannot resize a vector that is receiving input from another node.");
        return;
    }
    
    const currentSize = node.value.length;
    
    // Prompt for new size
    const size = prompt(`Enter vector size (current: ${currentSize}):`, currentSize);
    if (size === null) return;
    
    const newSize = parseInt(size);
    
    if (isNaN(newSize) || newSize < 1) {
        alert("Please enter a positive number for the vector size.");
        return;
    }
    
    // Resize the vector
    resizeVector(nodeId, newSize);
}

// Resize a vector to new dimensions
function resizeVector(nodeId, size) {
    const node = nodes[nodeId];
    if (!node) return;
    
    // Create new vector with specified size
    const newVector = [];
    for (let i = 0; i < size; i++) {
        // Preserve existing values if possible
        if (i < node.value.length) {
            newVector[i] = node.value[i];
        } else {
            newVector[i] = 0; // Fill new elements with zeros
        }
    }
    
    // Update node value
    node.value = newVector;
    node.element.querySelector('.vector-container').dataset.value = JSON.stringify(newVector);
    
    // Update table display
    const container = node.element.querySelector('.vector-container');
    container.innerHTML = createVectorTableHTML(nodeId, newVector);
    
    // Update dimensions display
    const dimensionsElement = node.element.querySelector('.vector-dimensions');
    if (dimensionsElement) {
        dimensionsElement.textContent = `${size}×1`;
    }
    
    // Re-evaluate graph
    if (typeof evaluateGraph === 'function') {
        evaluateGraph();
    }
}

// Update the display of a vector node based on new calculated values
export function updateVectorNodeDisplay(nodeId, calcValue) {
    const node = nodes[nodeId];
    if (!node) return;
    
    const container = node.element.querySelector('.vector-container');
    if (!container) return;
    
    // Handle different types of calculation results
    if (Array.isArray(calcValue)) {
        // Standard vector result
        container.dataset.value = JSON.stringify(calcValue);
        
        // Update dimensions display
        const dimensionsElement = node.element.querySelector('.vector-dimensions');
        if (dimensionsElement) {
            dimensionsElement.textContent = `${calcValue.length}×1`;
        }
        
        // Update table display
        container.innerHTML = createVectorTableHTML(nodeId, calcValue);
    } else if (typeof calcValue === 'number') {
        // Scalar result (e.g., from dot product)
        container.dataset.value = calcValue.toString();
        container.innerHTML = `<div class="p-2 text-center font-mono">${calcValue}</div>`;
        
        // Update dimensions display
        const dimensionsElement = node.element.querySelector('.vector-dimensions');
        if (dimensionsElement) {
            dimensionsElement.textContent = `scalar`;
        }
    } else if (typeof calcValue === 'string' && calcValue.startsWith('Error')) {
        // Handle error state
        container.innerHTML = `<div class="text-red-500 p-2">${calcValue}</div>`;
    }
}
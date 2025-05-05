// matrixNode.js - Matrix node implementation
import { nodes, getNextNodeId } from '../nodeStore.js';
import { createNodeElement } from './nodeFactory.js';

export function addMatrixNode(instance, isResult = false) {
    const id = getNextNodeId();
    const initialValue = [[1, 0], [0, 1]]; // Default 2x2 identity matrix
    const initialDisplayValue = JSON.stringify(initialValue);
    const nodeTitle = isResult ? 'Result' : 'Matrix';
    
    // Create HTML table display instead of text input
    const tableHTML = createMatrixTableHTML(id, initialValue);
    
    const content = `
        <div class="font-semibold text-gray-700 mb-2 text-center">${nodeTitle}</div>
        <div class="matrix-container" data-nodeid="${id}" data-value='${initialDisplayValue}'>
            ${tableHTML}
        </div>
        <div class="flex justify-between mt-2">
            <button class="resize-matrix-btn text-xs px-2 py-1 bg-purple-200 hover:bg-purple-300 rounded" data-action="resize" data-nodeid="${id}">
                Resize
            </button>
            <div class="matrix-dimensions text-xs text-gray-500">2×2</div>
        </div>
    `;
    
    const nodeElement = createNodeElement(id, 'matrix', content, initialDisplayValue, isResult);

    instance.draggable(nodeElement, { containment: 'parent' });

    instance.addEndpoint(id, { uuid: `${id}-in`, anchor: "Left", isTarget: true, maxConnections: 1 });
    instance.addEndpoint(id, { uuid: `${id}-out`, anchor: "Right", isSource: true });

    try {
        nodes[id] = { 
            type: 'matrix', 
            value: initialValue, 
            element: nodeElement, 
            inputs: {}, 
            output: null,
            isAutoResult: isResult
        };
    } catch (e) {
        nodes[id] = { 
            type: 'matrix', 
            value: [[1, 0], [0, 1]], 
            element: nodeElement, 
            inputs: {}, 
            output: null, 
            error: true,
            isAutoResult: isResult
        };
        console.error("Error parsing initial matrix value:", e);
    }
    
    // Add event listener for matrix cells
    setupMatrixEvents(nodeElement, id);
    
    return id;
}

// Create an HTML table for the matrix
function createMatrixTableHTML(nodeId, matrixData) {
    let html = `<table class="matrix-table w-full border-collapse">`;
    
    for (let i = 0; i < matrixData.length; i++) {
        html += `<tr>`;
        for (let j = 0; j < matrixData[i].length; j++) {
            html += `
                <td class="border border-gray-300 p-0">
                    <input type="text" 
                           value="${matrixData[i][j]}" 
                           data-row="${i}" 
                           data-col="${j}" 
                           data-nodeid="${nodeId}"
                           class="matrix-cell w-full h-full p-1 text-center text-sm"
                           readonly>
                </td>
            `;
        }
        html += `</tr>`;
    }
    
    html += `</table>`;
    return html;
}

// Set up event listeners for matrix table cells
function setupMatrixEvents(nodeElement, nodeId) {
    // Event delegation for matrix cell editing (single click instead of double click)
    nodeElement.addEventListener('click', (event) => {
        const cell = event.target.closest('.matrix-cell');
        if (!cell) return;
        
        // Check if node is connected to an input
        const node = nodes[nodeId];
        if (!node || Object.keys(node.inputs).length > 0) return;
        
        // Only proceed if the cell isn't already being edited
        if (!cell.readOnly) return;
        
        cell.readOnly = false;
        cell.classList.add('bg-white', 'border-purple-400');
        cell.focus();
        cell.select();
    });
    
    // Handle resize button click
    const resizeBtn = nodeElement.querySelector('.resize-matrix-btn');
    if (resizeBtn) {
        resizeBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            showMatrixResizeModal(nodeId);
        });
    }
}

// Global function to update a matrix node after cell edit
window.updateMatrixCell = function(input, nodeId) {
    const node = nodes[nodeId];
    if (!node) return;
    
    const row = parseInt(input.dataset.row);
    const col = parseInt(input.dataset.col);
    
    try {
        const value = parseFloat(input.value);
        if (isNaN(value)) throw new Error("Cell must contain a number");
        
        // Update the matrix value
        node.value[row][col] = value;
        node.element.querySelector('.matrix-container').dataset.value = JSON.stringify(node.value);
        
        // Restore cell display
        input.readOnly = true;
        input.classList.remove('bg-white', 'border-purple-400');
        
        // Re-evaluate graph
        if (typeof evaluateGraph === 'function') {
            evaluateGraph();
        }
    } catch (e) {
        console.error("Invalid matrix cell value:", e);
        input.classList.add('border-red-500');
        setTimeout(() => {
            input.classList.remove('border-red-500');
            input.value = node.value[row][col];
            input.readOnly = true;
            input.classList.remove('bg-white', 'border-purple-400');
        }, 1000);
    }
};

// Show modal dialog for resizing matrix
function showMatrixResizeModal(nodeId) {
    const node = nodes[nodeId];
    if (!node) return;
    
    // Check if node is connected to an input
    if (Object.keys(node.inputs).length > 0) {
        alert("Cannot resize a matrix that is receiving input from another node.");
        return;
    }
    
    const currentRows = node.value.length;
    const currentCols = node.value[0].length;
    
    // Prompt for new dimensions
    const rows = prompt(`Enter number of rows (current: ${currentRows}):`, currentRows);
    if (rows === null) return;
    
    const cols = prompt(`Enter number of columns (current: ${currentCols}):`, currentCols);
    if (cols === null) return;
    
    const newRows = parseInt(rows);
    const newCols = parseInt(cols);
    
    if (isNaN(newRows) || isNaN(newCols) || newRows < 1 || newCols < 1) {
        alert("Please enter positive numbers for rows and columns.");
        return;
    }
    
    // Resize the matrix
    resizeMatrix(nodeId, newRows, newCols);
}

// Resize a matrix to new dimensions
function resizeMatrix(nodeId, rows, cols) {
    const node = nodes[nodeId];
    if (!node) return;
    
    // Create new matrix with specified dimensions
    const newMatrix = [];
    for (let i = 0; i < rows; i++) {
        newMatrix[i] = [];
        for (let j = 0; j < cols; j++) {
            // Preserve existing values if possible
            if (i < node.value.length && j < node.value[i].length) {
                newMatrix[i][j] = node.value[i][j];
            } else {
                newMatrix[i][j] = 0; // Fill new cells with zeros
            }
        }
    }
    
    // Update node value
    node.value = newMatrix;
    node.element.querySelector('.matrix-container').dataset.value = JSON.stringify(newMatrix);
    
    // Update table display
    const container = node.element.querySelector('.matrix-container');
    container.innerHTML = createMatrixTableHTML(nodeId, newMatrix);
    
    // Update dimensions display
    const dimensionsElement = node.element.querySelector('.matrix-dimensions');
    if (dimensionsElement) {
        dimensionsElement.textContent = `${rows}×${cols}`;
    }
    
    // Re-evaluate graph
    if (typeof evaluateGraph === 'function') {
        evaluateGraph();
    }
}

// Update the display of a matrix node based on new calculated values
export function updateMatrixNodeDisplay(nodeId, calcValue) {
    const node = nodes[nodeId];
    if (!node) return;
    
    const container = node.element.querySelector('.matrix-container');
    if (!container) return;
    
    // Only update if this is valid matrix data
    if (Array.isArray(calcValue) && Array.isArray(calcValue[0])) {
        // Update the container's value attribute
        container.dataset.value = JSON.stringify(calcValue);
        
        // Update dimensions display
        const dimensionsElement = node.element.querySelector('.matrix-dimensions');
        if (dimensionsElement) {
            dimensionsElement.textContent = `${calcValue.length}×${calcValue[0].length}`;
        }
        
        // Update table display
        container.innerHTML = createMatrixTableHTML(nodeId, calcValue);
    } else if (typeof calcValue === 'string' && calcValue.startsWith('Error')) {
        // Handle error state
        container.innerHTML = `<div class="text-red-500 p-2">${calcValue}</div>`;
    }
}
// scalarNode.js - Scalar node implementation
import { nodes, getNextNodeId } from '../nodeStore.js';
import { createNodeElement } from './nodeFactory.js';
import { evaluateGraph } from '../calculator.js';

export function addScalarNode(instance, isResult = false) {
    const id = getNextNodeId();
    const initialValue = 1; // Default scalar value as number
    const initialDisplayValue = initialValue.toString();
    const nodeTitle = isResult ? 'Result' : 'Scalar';
    
    // Create HTML table for scalar display (similar to vector and matrix)
    const tableHTML = `
        <table class="scalar-table w-full border-collapse">
            <tr>
                <td class="border border-gray-300 p-0">
                    <input type="text" 
                           value="${initialValue}" 
                           data-nodeid="${id}"
                           class="scalar-cell w-full h-full p-1 text-center text-sm"
                           readonly>
                </td>
            </tr>
        </table>
    `;
    
    const content = `
        <div class="font-semibold text-gray-700 mb-2 text-center">${nodeTitle}</div>
        <div class="scalar-container" data-nodeid="${id}" data-value='${initialDisplayValue}'>
            ${tableHTML}
        </div>
    `;
    
    const nodeElement = createNodeElement(id, 'scalar', content, initialDisplayValue, isResult);

    instance.draggable(nodeElement, { containment: 'parent' });

    instance.addEndpoint(id, { uuid: `${id}-in`, anchor: "Left", isTarget: true, maxConnections: 1 });
    instance.addEndpoint(id, { uuid: `${id}-out`, anchor: "Right", isSource: true });

    try {
        nodes[id] = { 
            type: 'scalar', 
            value: initialValue, 
            element: nodeElement, 
            inputs: {}, 
            output: null,
            isAutoResult: isResult
        };
    } catch (e) {
        nodes[id] = { 
            type: 'scalar', 
            value: 0, 
            element: nodeElement, 
            inputs: {}, 
            output: null, 
            error: true,
            isAutoResult: isResult
        };
        console.error("Error parsing initial scalar value:", e);
    }
    
    // Add event listener for scalar cell editing
    setupScalarEvents(nodeElement, id);
    
    return id;
}

// Set up event listeners for scalar table cell
function setupScalarEvents(nodeElement, nodeId) {
    // Event delegation for scalar cell editing (single click instead of double click)
    nodeElement.addEventListener('click', (event) => {
        const cell = event.target.closest('.scalar-cell');
        if (!cell) return;
        
        // Check if node is connected to an input
        const node = nodes[nodeId];
        if (!node || Object.keys(node.inputs).length > 0) return;
        
        // Only proceed if the cell isn't already being edited
        if (!cell.readOnly) return;
        
        cell.readOnly = false;
        cell.classList.add('bg-white', 'border-blue-400');
        cell.focus();
        cell.select();
    });
}

// Function to update a scalar node value after cell edit
window.updateScalarCell = function(input, nodeId) {
    const node = nodes[nodeId];
    if (!node) return;
    
    try {
        const value = parseFloat(input.value);
        if (isNaN(value)) throw new Error("Cell must contain a number");
        
        // Update the scalar value
        node.value = value;
        node.element.querySelector('.scalar-container').dataset.value = value.toString();
        
        // Restore cell display
        input.readOnly = true;
        input.classList.remove('bg-white', 'border-blue-400');
        
        // Re-evaluate graph
        if (typeof evaluateGraph === 'function') {
            evaluateGraph();
        }
    } catch (e) {
        console.error("Invalid scalar cell value:", e);
        input.classList.add('border-red-500');
        setTimeout(() => {
            input.classList.remove('border-red-500');
            input.value = node.value.toString();
            input.readOnly = true;
            input.classList.remove('bg-white', 'border-blue-400');
        }, 1000);
    }
};

// Update the display of a scalar node based on new calculated values
export function updateScalarNodeDisplay(nodeId, calcValue) {
    const node = nodes[nodeId];
    if (!node) return;
    
    const container = node.element.querySelector('.scalar-container');
    if (!container) return;
    
    // Only update if this is a valid scalar value
    if (typeof calcValue === 'number') {
        // Update the container's value attribute
        container.dataset.value = calcValue.toString();
        
        // Update cell display
        const cell = container.querySelector('.scalar-cell');
        if (cell) {
            cell.value = calcValue.toString();
        }
    } else if (typeof calcValue === 'string' && calcValue.startsWith('Error')) {
        // Handle error state
        container.innerHTML = `<div class="text-red-500 p-2">${calcValue}</div>`;
    }
}
// operationNode.js - Operation node implementation
import { nodes, getNextNodeId } from '../nodeStore.js';
import { createNodeElement, getOperationEndpoints } from './nodeFactory.js';
import { addVectorNode } from './vectorNode.js';
import { evaluateGraph } from '../calculator.js';

export function addOperationNode(instance, op) {
    const id = getNextNodeId();
    const nodeType = 'operation';
    const colorClass = 'text-green-600';
    const title = 'Vector Op';

    const content = `
        <div class="font-semibold text-gray-700 text-center">${title}</div>
        <div data-nodeid="${id}" class="node-value-display text-2xl font-bold text-center ${colorClass} my-2 cursor-pointer">${op}</div>
    `;
    const nodeElement = createNodeElement(id, nodeType, content, op);

    instance.draggable(nodeElement, { containment: 'parent' });

    // Add endpoints first to ensure they're properly registered
    let endpointDefs = getOperationEndpoints(id, op);
    endpointDefs.forEach(def => {
        instance.addEndpoint(id, def.options, def.params);
    });

    // Create the node in our data structure
    nodes[id] = { type: nodeType, operation: op, element: nodeElement, inputs: {}, output: null };
    
    // Create an automatic result node, passing true to indicate it's a result node
    const resultNodeId = addVectorNode(instance, true);
    
    // Position the result node to the right of the operation node
    const resultNode = document.getElementById(resultNodeId);
    resultNode.style.left = `${parseInt(nodeElement.style.left) + 180}px`;
    resultNode.style.top = nodeElement.style.top;
    
    // Delay the connection to ensure all endpoints are fully initialized
    setTimeout(() => {
        connectNodes(instance, id, resultNodeId, op);
        
        // Run evaluation to show the initial result
        evaluateGraph();
    }, 100);
    
    return id;
}

// Helper function to connect nodes with retry capability
function connectNodes(instance, sourceId, targetId, op) {
    try {
        // Make sure the endpoint UUIDs are correctly specified
        const sourceEndpoint = `${sourceId}-${op}-out`;
        const targetEndpoint = `${targetId}-in`;
        
        // Check if endpoints exist before connecting
        const sourceEP = instance.getEndpoint(sourceEndpoint);
        const targetEP = instance.getEndpoint(targetEndpoint);
        
        if (!sourceEP || !targetEP) {
            console.warn(`Cannot connect: endpoints not found (${sourceEndpoint} -> ${targetEndpoint})`);
            // Retry once more with a delay
            setTimeout(() => retryConnect(instance, sourceId, targetId, op), 200);
            return;
        }
        
        // Use a safer connection approach
        const connection = instance.connect({
            sourceEndpoint: sourceEP,
            targetEndpoint: targetEP,
            detachable: true
        });
        
        if (connection) {
            console.log(`Successfully connected ${sourceId} to ${targetId}`);
            // Update the node data structures
            nodes[sourceId].output = targetId;
            nodes[targetId].inputs[targetEndpoint] = sourceId;
        } else {
            console.error(`Failed to create connection between ${sourceId} and ${targetId}`);
            // Retry once more with a delay
            setTimeout(() => retryConnect(instance, sourceId, targetId, op), 200);
        }
    } catch (err) {
        console.error("Error connecting nodes:", err);
        // Retry once more with a delay
        setTimeout(() => retryConnect(instance, sourceId, targetId, op), 200);
    }
}

// Additional retry function with better error handling
function retryConnect(instance, sourceId, targetId, op) {
    try {
        const sourceEndpoint = `${sourceId}-${op}-out`;
        const targetEndpoint = `${targetId}-in`;
        
        // Final check if endpoints exist
        if (!instance.getEndpoint(sourceEndpoint) || !instance.getEndpoint(targetEndpoint)) {
            console.error(`Retry failed: endpoints still not found (${sourceEndpoint} -> ${targetEndpoint})`);
            return;
        }
        
        // Try direct endpoint connection instead of using source/target IDs
        const connection = instance.connect({
            sourceEndpoint: instance.getEndpoint(sourceEndpoint),
            targetEndpoint: instance.getEndpoint(targetEndpoint),
            detachable: true
        });
        
        if (connection) {
            console.log(`Successfully connected ${sourceId} to ${targetId} on retry`);
            // Update the node data structures
            nodes[sourceId].output = targetId;
            nodes[targetId].inputs[targetEndpoint] = sourceId;
        } else {
            console.error(`Failed to create connection between ${sourceId} and ${targetId} on retry`);
        }
    } catch (err) {
        console.error("Error on retry connecting nodes:", err);
    }
}
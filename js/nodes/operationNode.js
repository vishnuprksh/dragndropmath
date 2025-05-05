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

    let endpointDefs = getOperationEndpoints(id, op);
    endpointDefs.forEach(def => {
        instance.addEndpoint(id, def.options, def.params);
    });

    nodes[id] = { type: nodeType, operation: op, element: nodeElement, inputs: {}, output: null };
    
    // Create an automatic result node, passing true to indicate it's a result node
    const resultNodeId = addVectorNode(instance, true);
    
    // Position the result node to the right of the operation node
    const resultNode = document.getElementById(resultNodeId);
    resultNode.style.left = `${parseInt(nodeElement.style.left) + 180}px`;
    resultNode.style.top = nodeElement.style.top;
    
    // Make sure both endpoints are available before trying to connect
    instance.ready(function() {
        // Connect the operation node to the result node immediately when jsPlumb is ready
        try {
            const connection = instance.connect({
                source: id,
                target: resultNodeId,
                sourceEndpoint: `${id}-${op}-out`,
                targetEndpoint: `${resultNodeId}-in`,
                detachable: true
            });
            
            if (connection) {
                console.log(`Successfully connected ${id} to ${resultNodeId}`);
                // Update the node data structures
                nodes[id].output = resultNodeId;
                nodes[resultNodeId].inputs[`${resultNodeId}-in`] = id;
            } else {
                console.error(`Failed to create connection between ${id} and ${resultNodeId}`);
            }
        } catch (err) {
            console.error("Error connecting nodes:", err);
            // Try a second time with setTimeout as a fallback
            setTimeout(() => connectNodes(instance, id, resultNodeId, op), 200);
        }
        
        // Run evaluation to show the initial result
        evaluateGraph();
    });
    
    return id;
}

// Helper function to connect nodes with retry capability
function connectNodes(instance, sourceId, targetId, op) {
    try {
        const connection = instance.connect({
            source: sourceId,
            target: targetId,
            sourceEndpoint: `${sourceId}-${op}-out`,
            targetEndpoint: `${targetId}-in`,
            detachable: true
        });
        
        if (connection) {
            console.log(`Successfully connected ${sourceId} to ${targetId} on retry`);
            // Update the node data structures
            nodes[sourceId].output = targetId;
            nodes[targetId].inputs[`${targetId}-in`] = sourceId;
            
            // Run evaluation to show the initial result
            evaluateGraph();
        } else {
            console.error(`Failed to create connection between ${sourceId} and ${targetId} on retry`);
        }
    } catch (err) {
        console.error("Error on retry connecting nodes:", err);
    }
}
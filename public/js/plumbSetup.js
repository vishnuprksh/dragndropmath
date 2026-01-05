// plumbSetup.js - jsPlumb configuration and setup
import { nodes } from './nodeStore.js';
import { evaluateGraph } from './calculator.js';

export function setupJsPlumb() {
    // First check for the zoom container - it might not exist yet
    const container = document.getElementById('zoom-container') || document.getElementById('workspace');
    
    const instance = jsPlumb.getInstance({
        Container: container,
        DragOptions: { cursor: 'pointer', zIndex: 2000 },
        PaintStyle: { stroke: '#cbd5e1', strokeWidth: 8 }, // Thick connection to look like joined pieces
        EndpointStyle: { radius: 12, fill: 'transparent' }, // Invisible endpoints
        EndpointHoverStyle: { fill: 'transparent' },
        Connector: ["Bezier", { curviness: 30 }],
        Anchor: "Continuous",
        ConnectionOverlays: [],
        ReattachConnections: true
    });

    // Set up connection event handlers
    setupConnectionHandlers(instance);
    
    return instance;
}

function setupConnectionHandlers(instance) {
    // Highlight valid targets when dragging a connection
    instance.bind("connectionDrag", (connection) => {
        const endpoints = instance.selectEndpoints();
        endpoints.each(endpoint => {
            if (endpoint.isTarget) {
                endpoint.canvas.classList.add('magnetic-target');
            }
        });
    });

    instance.bind("connectionDragStop", (connection) => {
        const endpoints = instance.selectEndpoints();
        endpoints.each(endpoint => {
            endpoint.canvas.classList.remove('magnetic-target');
        });
    });

    // Connection created
    instance.bind("connection", (info, originalEvent) => {
        if (!originalEvent) return;

        const sourceId = info.sourceId;
        const targetId = info.targetId;
        
        // Magnetic Snapping: Move nodes together
        const sourceNode = document.getElementById(sourceId);
        const targetNode = document.getElementById(targetId);
        
        if (sourceNode && targetNode) {
            const sourceRect = sourceNode.getBoundingClientRect();
            const targetRect = targetNode.getBoundingClientRect();
            
            // Calculate target position to "snap" the jigsaw pieces
            // The source node's right edge should touch the target node's left edge
            // We adjust for the jigsaw tab/notch overlap (approx 10px)
            const newLeft = parseInt(sourceNode.style.left) + sourceNode.offsetWidth - 10;
            const newTop = parseInt(sourceNode.style.top);
            
            // Only snap if they are relatively close already (to avoid jumping across screen)
            const dist = Math.sqrt(Math.pow(targetRect.left - sourceRect.right, 2) + Math.pow(targetRect.top - sourceRect.top, 2));
            if (dist < 100) {
                targetNode.style.left = `${newLeft}px`;
                targetNode.style.top = `${newTop}px`;
                instance.revalidate(targetId);
            }
        }

        const sourceEndpointUuid = info.sourceEndpoint.getUuid();
        const targetEndpointUuid = info.targetEndpoint.getUuid();

        console.log(`Connection: ${sourceId} -> ${targetId}`);

        if (nodes[sourceId]) nodes[sourceId].output = targetId;

        if (nodes[targetId]) {
            nodes[targetId].inputs[targetEndpointUuid] = sourceId;
            if ((nodes[targetId].type === 'vector' || nodes[targetId].type === 'list')) {
                if (Object.keys(nodes[targetId].inputs).length > 0) {
                    const inputElement = nodes[targetId].element.querySelector('.node-value-display');
                    inputElement.readOnly = true;
                    inputElement.classList.add('bg-gray-50');
                    inputElement.classList.remove('bg-white', 'border-blue-400', 'border-purple-400', 'border-red-500');
                }
            }
            evaluateGraph();
        } else {
            evaluateGraph();
        }
    });

    // Connection detached
    instance.bind("connectionDetached", (info, originalEvent) => {
        if (!originalEvent) return;

        const sourceId = info.sourceId;
        const targetId = info.targetId;
        const targetEndpointUuid = info.targetEndpoint.getUuid();

        console.log(`Detached: ${sourceId} -> ${targetId}`);

        if (nodes[sourceId] && nodes[sourceId].output === targetId) {
            nodes[sourceId].output = null;
        }
        if (nodes[targetId] && nodes[targetId].inputs[targetEndpointUuid] === sourceId) {
            delete nodes[targetId].inputs[targetEndpointUuid];
            if ((nodes[targetId].type === 'vector' || nodes[targetId].type === 'list')) {
                const node = nodes[targetId];
                if (Object.keys(node.inputs).length === 0) {
                    const inputElement = node.element.querySelector('.node-value-display');
                    inputElement.classList.remove('bg-gray-50', 'border-blue-400', 'border-purple-400', 'border-red-500');
                    inputElement.value = node.element.dataset.value || (node.type === 'list' ? '[]' : '[0, 0]');
                    node.error = false;
                }
                node.calculatedValue = undefined;
            }
        }
        evaluateGraph();
    });

    // Prevent connecting a node to itself and other meaningless connections
    instance.bind("beforeDrop", (params) => {
        return validateConnection(params.sourceId, params.targetId);
    });
}

export function validateConnection(sourceId, targetId) {
    // 1. Cannot connect a node to itself
    if (sourceId === targetId) return false;

    const sourceNode = nodes[sourceId];
    const targetNode = nodes[targetId];

    if (!sourceNode || !targetNode) return false;

    // 2. Cannot connect two value nodes directly (e.g., Scalar to Scalar)
    const isSourceValue = ['scalar', 'vector', 'matrix'].includes(sourceNode.type);
    const isTargetValue = ['scalar', 'vector', 'matrix'].includes(targetNode.type);

    if (isSourceValue && isTargetValue) {
        console.warn("Meaningless connection: Cannot connect two value nodes directly. Use an operator.");
        return false;
    }

    // 3. Cannot connect two operation nodes directly
    if (sourceNode.type === 'operation' && targetNode.type === 'operation') {
        console.warn("Meaningless connection: Cannot connect two operation nodes directly. Connect to a value node first.");
        return false;
    }

    return true;
}

export function checkMagneticConnection(draggedNodeId, instance) {
    const draggedNode = document.getElementById(draggedNodeId);
    if (!draggedNode) return;

    const draggedRect = draggedNode.getBoundingClientRect();
    const threshold = 60; // Distance threshold for snapping

    // Iterate over all other nodes
    for (const nodeId in nodes) {
        if (nodeId === draggedNodeId) continue;
        
        const targetNode = document.getElementById(nodeId);
        if (!targetNode) continue;
        
        const targetRect = targetNode.getBoundingClientRect();
        
        // Check if dragged node is to the LEFT of target (Dragged Output -> Target Input)
        // Dragged Right Edge ~ Target Left Edge
        const distRightLeft = Math.abs(draggedRect.right - targetRect.left);
        const distTop = Math.abs(draggedRect.top - targetRect.top);
        
        if (distRightLeft < threshold && distTop < threshold) {
            if (validateConnection(draggedNodeId, nodeId)) {
                // Snap position: Dragged node is Source
                const newLeft = parseInt(targetNode.style.left) - draggedNode.offsetWidth + 10; // +10 for overlap
                const newTop = parseInt(targetNode.style.top);
                
                draggedNode.style.left = `${newLeft}px`;
                draggedNode.style.top = `${newTop}px`;
                instance.revalidate(draggedNodeId);
                
                // Create connection
                const sourceEndpoint = instance.getEndpoints(draggedNodeId).find(e => e.isSource);
                // Find the first free target endpoint
                const targetEndpoints = instance.getEndpoints(nodeId).filter(e => e.isTarget);
                const targetEndpoint = targetEndpoints.find(e => e.connections.length === 0);
                
                if (sourceEndpoint && targetEndpoint) {
                    instance.connect({ source: sourceEndpoint, target: targetEndpoint });
                    return; 
                }
            }
        }
        
        // Check if dragged node is to the RIGHT of target (Target Output -> Dragged Input)
        // Target Right Edge ~ Dragged Left Edge
        const distLeftRight = Math.abs(draggedRect.left - targetRect.right);
        
        if (distLeftRight < threshold && distTop < threshold) {
             if (validateConnection(nodeId, draggedNodeId)) {
                // Snap position: Dragged node is Target
                const newLeft = parseInt(targetNode.style.left) + targetNode.offsetWidth - 10;
                const newTop = parseInt(targetNode.style.top);
                
                draggedNode.style.left = `${newLeft}px`;
                draggedNode.style.top = `${newTop}px`;
                instance.revalidate(draggedNodeId);
                
                // Create connection
                const sourceEndpoint = instance.getEndpoints(nodeId).find(e => e.isSource);
                const targetEndpoints = instance.getEndpoints(draggedNodeId).filter(e => e.isTarget);
                const targetEndpoint = targetEndpoints.find(e => e.connections.length === 0);
                
                if (sourceEndpoint && targetEndpoint) {
                    instance.connect({ source: sourceEndpoint, target: targetEndpoint });
                    return;
                }
             }
        }
    }
}
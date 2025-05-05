// plumbSetup.js - jsPlumb configuration and setup
import { nodes } from './nodeStore.js';
import { evaluateGraph } from './calculator.js';

export function setupJsPlumb() {
    const instance = jsPlumb.getInstance({
        Container: "workspace",
        DragOptions: { cursor: 'pointer', zIndex: 2000 },
        PaintStyle: { stroke: '#4a5568', strokeWidth: 2 }, // Tailwind gray-700
        EndpointStyle: { radius: 8, fill: '#4a5568' }, // Tailwind gray-700
        EndpointHoverStyle: { fill: '#2b6cb0' }, // Tailwind blue-700
        Connector: ["Bezier", { curviness: 50 }],
        Anchor: "Continuous", // Allows connections anywhere along the edge
        ConnectionOverlays: [
            ["Arrow", {
                location: 1,
                id: "arrow",
                length: 10,
                foldback: 0.8,
                width: 10,
            }]
        ]
    });

    // Set up connection event handlers
    setupConnectionHandlers(instance);
    
    return instance;
}

function setupConnectionHandlers(instance) {
    // Connection created
    instance.bind("connection", (info, originalEvent) => {
        if (!originalEvent) return;

        const sourceId = info.sourceId;
        const targetId = info.targetId;
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

    // Prevent connecting a node to itself
    instance.bind("beforeDrop", (params) => {
        return params.sourceId !== params.targetId;
    });
}
// calculator.js - Logic for evaluating the graph of nodes
import { nodes, getNodeValue, updateNodeDisplay } from './nodeStore.js';
import { isValidVector } from './nodes/nodeFactory.js';

export function evaluateGraph() {
    console.log("Evaluating graph...");

    // Reset calculated values for vector nodes
    Object.keys(nodes).forEach(id => {
        if (nodes[id].type === 'vector') {
            nodes[id].calculatedValue = undefined;
        }
    });

    let changed = true;
    let iterations = 0;
    const maxIterations = 10;

    // Iteratively evaluate nodes until no more changes or max iterations reached
    while (changed && iterations < maxIterations) {
        changed = false;
        iterations++;

        Object.keys(nodes).forEach(id => {
            const node = nodes[id];
            let result = null;

            if (node.type === 'operation') {
                result = evaluateVectorOperation(node);
            }

            // Propagate the result to output nodes if applicable
            if (node.output && nodes[node.output]) {
                const outputNode = nodes[node.output];
                let canPropagate = false;

                if (outputNode.type === 'vector' && (isValidVector(result) || result === null || typeof result === 'string')) {
                    canPropagate = true;
                }

                if (canPropagate) {
                    const currentCalcValueStr = JSON.stringify(outputNode.calculatedValue);
                    const newResultStr = JSON.stringify(result);

                    if (currentCalcValueStr !== newResultStr) {
                        outputNode.calculatedValue = result;
                        changed = true;
                    }
                } else {
                    console.warn(`Type mismatch: Cannot propagate result from ${node.type} '${node.operation}' to ${outputNode.type} node ${node.output}`);
                    if (outputNode.calculatedValue !== undefined) {
                        outputNode.calculatedValue = 'Error: Type Mismatch';
                        changed = true;
                    }
                }
            }
        });
    }

    if (iterations === maxIterations) {
        console.warn("Max evaluation iterations reached.");
    }

    // Update displays for all vector nodes
    Object.keys(nodes).forEach(id => {
        if (nodes[id].type === 'vector') {
            updateNodeDisplay(id);
        }
    });

    console.log("Evaluation complete.");
}

function evaluateVectorOperation(node) {
    const input1Id = Object.entries(node.inputs).find(([uuid, sourceId]) => uuid.endsWith('-in1'))?.[1];
    const input2Id = Object.entries(node.inputs).find(([uuid, sourceId]) => uuid.endsWith('-in2'))?.[1];
    const val1 = input1Id ? getNodeValue(input1Id) : null;
    const val2 = input2Id ? getNodeValue(input2Id) : null;

    if (val1 === null || val2 === null) {
        return null;
    } else if (!isValidVector(val1) || !isValidVector(val2)) {
        return 'Error: Input(s) not vector(s)';
    } else {
        try {
            switch (node.operation) {
                case '+':
                    return [val1[0] + val2[0], val1[1] + val2[1]];
                case '-':
                    return [val1[0] - val2[0], val1[1] - val2[1]];
                case '*':
                    return [val1[0] * val2[0], val1[1] * val2[1]];
                case '/':
                    if (val2[0] === 0 || val2[1] === 0) {
                        return 'Error: Div by zero in vector';
                    } else {
                        return [val1[0] / val2[0], val1[1] / val2[1]];
                    }
                default:
                    return 'Error: Unknown Op';
            }
        } catch (e) {
            console.error(`Error during vector operation ${node.operation} on node ${node.id}:`, e);
            return 'Error: Calc Failed';
        }
    }
}
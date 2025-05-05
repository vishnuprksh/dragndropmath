// calculator.js - Logic for evaluating the graph of nodes
import { nodes, getNodeValue, updateNodeDisplay } from './nodeStore.js';
import { isValidVector } from './nodes/nodeFactory.js';
// The math library is now available globally from the CDN

export function evaluateGraph() {
    console.log("Evaluating graph...");

    // Reset calculated values for vector nodes that are result nodes
    Object.keys(nodes).forEach(id => {
        if (nodes[id].type === 'vector' && nodes[id].isAutoResult) {
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
                
                // Propagate the result to output nodes if applicable
                if (node.output && nodes[node.output]) {
                    const outputNode = nodes[node.output];
                    let canPropagate = false;

                    // Only propagate to vector nodes, not to operation nodes
                    if (outputNode.type === 'vector' && (isValidVector(result) || result === null || typeof result === 'string' || typeof result === 'number')) {
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
    
    // Handle case where inputs aren't connected yet
    if (!input1Id || !input2Id) {
        return null;
    }
    
    const val1 = input1Id ? getNodeValue(input1Id) : null;
    const val2 = input2Id ? getNodeValue(input2Id) : null;

    if (val1 === null || val2 === null) {
        return null;
    } else if (!isValidVector(val1) || !isValidVector(val2)) {
        return 'Error: Input(s) not vector(s)';
    } else {
        try {
            // Convert arrays to mathjs matrices to use proper matrix operations
            const matrix1 = math.matrix(val1);
            const matrix2 = math.matrix(val2);

            switch (node.operation) {
                case '+':
                    // Matrix addition
                    return math.squeeze(math.add(matrix1, matrix2)).toArray();
                case '-':
                    // Matrix subtraction
                    return math.squeeze(math.subtract(matrix1, matrix2)).toArray();
                case '*':
                    // Dot product for vectors (returns a scalar)
                    return math.dot(val1, val2);
                case '/':
                    // Check if any element in val2 is zero
                    const hasZero = val2.some(value => value === 0);
                    if (hasZero) {
                        return 'Error: Div by zero in vector';
                    } else {
                        // Element-wise division (kept for backward compatibility)
                        return math.squeeze(math.dotDivide(matrix1, matrix2)).toArray();
                    }
                case 'cross':
                    // Cross product
                    // For 2D vectors, we'll treat them as 3D with z=0 and return only the z component
                    const vec1_3d = [val1[0], val1[1], 0];
                    const vec2_3d = [val2[0], val2[1], 0];
                    const result = math.cross(vec1_3d, vec2_3d);
                    return result[2]; // This is a scalar (the z component of the cross product)
                case 'matmul':
                    // Matrix multiplication
                    // For 2D vectors, we'll interpret this as matrix multiply
                    // Treating vectors as column matrices
                    return math.multiply(val1, val2);
                default:
                    return 'Error: Unknown Op';
            }
        } catch (e) {
            console.error(`Error during vector operation ${node.operation} on node ${node.id}:`, e);
            return 'Error: Calc Failed';
        }
    }
}
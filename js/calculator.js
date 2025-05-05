// calculator.js - Logic for evaluating the graph of nodes
import { nodes, getNodeValue, updateNodeDisplay } from './nodeStore.js';
import { isValidVector } from './nodes/nodeFactory.js';
// The math library is now available globally from the CDN

export function evaluateGraph() {
    console.log("Evaluating graph...");

    // Reset calculated values for result nodes
    Object.keys(nodes).forEach(id => {
        if ((nodes[id].type === 'vector' || nodes[id].type === 'scalar' || nodes[id].type === 'matrix') && 
            nodes[id].isAutoResult) {
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
                // Call the appropriate evaluation function based on operation type
                if (node.operationFor === 'scalar') {
                    result = evaluateScalarOperation(node);
                } else if (node.operationFor === 'matrix') {
                    result = evaluateMatrixOperation(node);
                } else {
                    result = evaluateVectorOperation(node);
                }
                
                // Propagate the result to output nodes if applicable
                if (node.output && nodes[node.output]) {
                    const outputNode = nodes[node.output];
                    let canPropagate = false;

                    // Match result type to output node type
                    if (node.operationFor === outputNode.type || 
                        (result === null || typeof result === 'string')) {
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

    // Update displays for all data nodes
    Object.keys(nodes).forEach(id => {
        if (nodes[id].type === 'vector' || nodes[id].type === 'scalar' || nodes[id].type === 'matrix') {
            updateNodeDisplay(id);
        }
    });

    console.log("Evaluation complete.");
}

function evaluateScalarOperation(node) {
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
    } else if (typeof val1 !== 'number' || typeof val2 !== 'number') {
        return 'Error: Input(s) not valid scalar(s)';
    } else {
        try {
            switch (node.operation) {
                case '+':
                    return val1 + val2;
                case '-':
                    return val1 - val2;
                case '*':
                    return val1 * val2;
                case '/':
                    if (val2 === 0) {
                        return 'Error: Division by zero';
                    }
                    return val1 / val2;
                case 'pow':
                    return Math.pow(val1, val2);
                default:
                    return 'Error: Unknown Op';
            }
        } catch (e) {
            console.error(`Error during scalar operation ${node.operation} on node ${node.id}:`, e);
            return 'Error: Calculation Failed';
        }
    }
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
        return 'Error: Input(s) not valid vector(s)';
    } else {
        try {
            // Convert arrays to mathjs matrices to use proper vector operations
            // Handle both arrays and scalar values
            const matrix1 = typeof val1 === 'number' ? val1 : math.matrix(val1);
            const matrix2 = typeof val2 === 'number' ? val2 : math.matrix(val2);

            switch (node.operation) {
                case '+':
                    // Vector addition
                    try {
                        // For scalar + vector cases, wrap scalar in appropriate array
                        if (typeof val1 === 'number' && Array.isArray(val2)) {
                            return val2.map(v => val1 + v);
                        } else if (Array.isArray(val1) && typeof val2 === 'number') {
                            return val1.map(v => v + val2);
                        }
                        return math.squeeze(math.add(matrix1, matrix2)).toArray();
                    } catch (e) {
                        return 'Error: Vector dimensions must match for addition';
                    }
                case '-':
                    // Vector subtraction
                    try {
                        // For scalar - vector cases, wrap scalar in appropriate array
                        if (typeof val1 === 'number' && Array.isArray(val2)) {
                            return val2.map(v => val1 - v);
                        } else if (Array.isArray(val1) && typeof val2 === 'number') {
                            return val1.map(v => v - val2);
                        }
                        return math.squeeze(math.subtract(matrix1, matrix2)).toArray();
                    } catch (e) {
                        return 'Error: Vector dimensions must match for subtraction';
                    }
                case '*':
                    // Element-wise multiplication
                    try {
                        // Handle scalar * vector cases manually
                        if (typeof val1 === 'number' && Array.isArray(val2)) {
                            return val2.map(v => val1 * v);
                        } else if (Array.isArray(val1) && typeof val2 === 'number') {
                            return val1.map(v => v * val2);
                        }
                        return math.squeeze(math.dotMultiply(matrix1, matrix2)).toArray();
                    } catch (e) {
                        return 'Error: Vector dimensions must match for element-wise multiplication';
                    }
                case '/':
                    // Element-wise division
                    try {
                        // Handle scalar / vector cases manually
                        if (typeof val1 === 'number' && Array.isArray(val2)) {
                            // Check division by zero
                            if (val2.some(value => value === 0)) {
                                return 'Error: Division by zero';
                            }
                            return val2.map(v => val1 / v);
                        } else if (Array.isArray(val1) && typeof val2 === 'number') {
                            // Check division by zero
                            if (val2 === 0) {
                                return 'Error: Division by zero';
                            }
                            return val1.map(v => v / val2);
                        }
                        
                        // Check if any element in val2 is zero (for flat arrays)
                        if (Array.isArray(val2) && !Array.isArray(val2[0]) && val2.some(value => value === 0)) {
                            return 'Error: Division by zero';
                        }
                        return math.squeeze(math.dotDivide(matrix1, matrix2)).toArray();
                    } catch (e) {
                        return 'Error: Vector dimensions must match for division';
                    }
                case 'cross':
                    // Cross product - only works with 3D vectors
                    try {
                        // Prepare vectors for cross product (must be 3D)
                        let vec1_3d, vec2_3d;
                        
                        // Handle different input vector dimensions
                        if (Array.isArray(val1) && !Array.isArray(val1[0])) {
                            // Convert to 3D vector if needed
                            if (val1.length === 2) {
                                vec1_3d = [val1[0], val1[1], 0];
                            } else if (val1.length === 3) {
                                vec1_3d = val1;
                            } else {
                                return 'Error: Cross product requires 2D or 3D vectors';
                            }
                        } else {
                            return 'Error: Cross product requires vectors, not matrices';
                        }
                        
                        if (Array.isArray(val2) && !Array.isArray(val2[0])) {
                            // Convert to 3D vector if needed
                            if (val2.length === 2) {
                                vec2_3d = [val2[0], val2[1], 0];
                            } else if (val2.length === 3) {
                                vec2_3d = val2;
                            } else {
                                return 'Error: Cross product requires 2D or 3D vectors';
                            }
                        } else {
                            return 'Error: Cross product requires vectors, not matrices';
                        }
                        
                        // Calculate cross product
                        const result = math.cross(vec1_3d, vec2_3d);
                        
                        // Return appropriate result based on input dimensions
                        if (val1.length === 2 && val2.length === 2) {
                            // For 2D vectors, return just the z component (scalar)
                            return result[2]; 
                        } else {
                            // For 3D vectors, return the full 3D result
                            return result;
                        }
                    } catch (e) {
                        return 'Error: Cross product calculation failed';
                    }
                case 'dot':
                    // Dot product
                    try {
                        if (Array.isArray(val1) && Array.isArray(val2) && 
                            !Array.isArray(val1[0]) && !Array.isArray(val2[0])) {
                            return math.dot(val1, val2);
                        } else {
                            return 'Error: Dot product requires 1D vectors';
                        }
                    } catch (e) {
                        return 'Error: Dot product calculation failed';
                    }
                default:
                    return 'Error: Unknown Op';
            }
        } catch (e) {
            console.error(`Error during vector operation ${node.operation} on node ${node.id}:`, e);
            return 'Error: Calculation Failed';
        }
    }
}

function evaluateMatrixOperation(node) {
    const input1Id = Object.entries(node.inputs).find(([uuid, sourceId]) => uuid.endsWith('-in1'))?.[1];
    const input2Id = Object.entries(node.inputs).find(([uuid, sourceId]) => uuid.endsWith('-in2'))?.[1];
    
    // For unary operations (det, transpose), we only need input1
    const isUnaryOp = node.operation === 'det' || node.operation === 'transpose';
    
    // Handle case where inputs aren't connected yet
    if (!input1Id || (!isUnaryOp && !input2Id)) {
        return null;
    }
    
    const val1 = input1Id ? getNodeValue(input1Id) : null;
    const val2 = input2Id ? getNodeValue(input2Id) : null;

    if (val1 === null || (!isUnaryOp && val2 === null)) {
        return null;
    }
    
    // Check if inputs are valid matrices (arrays of arrays)
    const isMatrix1 = Array.isArray(val1) && val1.length > 0 && Array.isArray(val1[0]);
    const isMatrix2 = isUnaryOp ? true : Array.isArray(val2) && val2.length > 0 && Array.isArray(val2[0]);
    
    // For unary operations like det and transpose, only the first input needs to be a matrix
    if (!isMatrix1 || (!isUnaryOp && !isMatrix2)) {
        return 'Error: Matrix operations require matrix inputs';
    }

    try {
        // Convert arrays to mathjs matrices to use proper matrix operations
        const matrix1 = math.matrix(val1);
        const matrix2 = isUnaryOp ? null : math.matrix(val2);

        switch (node.operation) {
            case '+':
                // Matrix addition
                try {
                    return math.squeeze(math.add(matrix1, matrix2)).toArray();
                } catch (e) {
                    return 'Error: Matrix dimensions must match for addition';
                }
            case '-':
                // Matrix subtraction
                try {
                    return math.squeeze(math.subtract(matrix1, matrix2)).toArray();
                } catch (e) {
                    return 'Error: Matrix dimensions must match for subtraction';
                }
            case '*':
                // Element-wise multiplication
                try {
                    return math.squeeze(math.dotMultiply(matrix1, matrix2)).toArray();
                } catch (e) {
                    return 'Error: Matrix dimensions must match for element-wise multiplication';
                }
            case 'matmul':
                // Matrix multiplication
                try {
                    return math.squeeze(math.multiply(matrix1, matrix2)).toArray();
                } catch (e) {
                    return 'Error: Matrix dimensions incompatible for multiplication';
                }
            case 'det':
                // Matrix determinant (only first input is used)
                try {
                    // det only works on square matrices
                    const size = math.size(matrix1).toArray();
                    if (size.length !== 2 || size[0] !== size[1]) {
                        return 'Error: Determinant requires a square matrix';
                    }
                    return math.det(matrix1);
                } catch (e) {
                    return 'Error: Determinant calculation failed';
                }
            case 'transpose':
                // Matrix transpose (only first input is used)
                try {
                    return math.squeeze(math.transpose(matrix1)).toArray();
                } catch (e) {
                    return 'Error: Transpose calculation failed';
                }
            default:
                return 'Error: Unknown Op';
        }
    } catch (e) {
        console.error(`Error during matrix operation ${node.operation} on node ${node.id}:`, e);
        return 'Error: Calculation Failed';
    }
}
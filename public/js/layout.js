// layout.js - Automatic node rearrangement logic
import { nodes } from './nodeStore.js';

/**
 * Automatically rearranges nodes in a layered layout.
 * @param {Object} instance - The jsPlumb instance
 */
export function autoRearrange(instance) {
    const nodeIds = Object.keys(nodes);
    if (nodeIds.length === 0) return;

    const levels = {};
    const visited = new Set();

    // Calculate levels using a simple DFS-based approach
    function getLevel(nodeId) {
        if (levels[nodeId] !== undefined) return levels[nodeId];
        
        const node = nodes[nodeId];
        if (!node) return 0;

        const inputIds = Object.values(node.inputs || {});
        
        if (inputIds.length === 0) {
            levels[nodeId] = 0;
            return 0;
        }

        // To avoid infinite loops in case of cycles
        if (visited.has(nodeId)) return 0;
        visited.add(nodeId);

        let maxInputLevel = -1;
        for (const inputId of inputIds) {
            maxInputLevel = Math.max(maxInputLevel, getLevel(inputId));
        }
        
        visited.delete(nodeId);
        levels[nodeId] = maxInputLevel + 1;
        return levels[nodeId];
    }

    nodeIds.forEach(id => getLevel(id));

    // Group nodes by level
    const nodesByLevel = {};
    Object.entries(levels).forEach(([id, level]) => {
        if (!nodesByLevel[level]) nodesByLevel[level] = [];
        nodesByLevel[level].push(id);
    });

    // Layout parameters
    const startX = 50;
    const startY = 50;
    const horizontalSpacing = 250;
    const verticalSpacing = 150;

    // Apply positions
    Object.entries(nodesByLevel).forEach(([level, ids]) => {
        const x = startX + parseInt(level) * horizontalSpacing;
        ids.forEach((id, index) => {
            const y = startY + index * verticalSpacing;
            const element = nodes[id].element;
            if (element) {
                element.style.left = `${x}px`;
                element.style.top = `${y}px`;
            }
        });
    });

    // Update jsPlumb connections
    instance.repaintEverything();
}

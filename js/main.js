// main.js - Entry point for the application
import { setupJsPlumb } from './plumbSetup.js';
import { setupEventListeners } from './eventHandlers.js';
import { evaluateGraph } from './calculator.js';
import { nodes } from './nodeStore.js';
import { setupZoomPan } from './zoomPan.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize jsPlumb instance
    const instance = setupJsPlumb();
    
    // Setup zoom and pan functionality
    const zoomPanControls = setupZoomPan(instance);
    
    // Setup event listeners for buttons and interactions
    setupEventListeners(instance);
    
    // Initial graph evaluation
    evaluateGraph();
    
    // Expose zoom controls to window for debugging if needed
    window.zoomPanControls = zoomPanControls;
});
// main.js - Entry point for the application
import { setupJsPlumb } from './plumbSetup.js';
import { setupEventListeners } from './eventHandlers.js';
import { evaluateGraph } from './calculator.js';
import { nodes } from './nodeStore.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize jsPlumb instance
    const instance = setupJsPlumb();
    
    // Setup event listeners for buttons and interactions
    setupEventListeners(instance);
    
    // Initial graph evaluation
    evaluateGraph();
});
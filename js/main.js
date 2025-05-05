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

    // Setup responsive sidebar toggle
    setupResponsiveLayout();
});

// Function to handle responsive layout elements
function setupResponsiveLayout() {
    // Get sidebar toggle button and sidebar element
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const toggleIcon = document.querySelector('.toggle-icon');
    const workspace = document.getElementById('workspace');

    // Handle sidebar toggle click
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', (e) => {
            // Prevent default to avoid any scroll behavior
            e.preventDefault();
            toggleSidebar();
        });
    }

    // Function to toggle sidebar open/closed
    function toggleSidebar() {
        sidebar.classList.toggle('collapsed');
        
        // Update toggle icon
        if (sidebar.classList.contains('collapsed')) {
            toggleIcon.textContent = '▼';
            // Enable workspace interaction when sidebar is collapsed
            if (workspace) {
                workspace.style.pointerEvents = 'auto';
            }
        } else {
            toggleIcon.textContent = '▲';
            // On mobile, disable workspace interaction when expanded sidebar
            if (window.innerWidth <= 768 && workspace) {
                workspace.style.pointerEvents = 'none';
            }
        }
        
        // Force a repaint to fix any visual glitches
        if (window.instance) {
            setTimeout(() => {
                window.instance.repaintEverything();
            }, 300); // After transition completes
        }
    }

    // Handle window resize events to adjust layout
    window.addEventListener('resize', handleResize);
    
    // Initial call to handle layout based on current screen size
    handleResize();
    
    // Ensure jsPlumb repaints connections when sidebar is toggled
    if (sidebar) {
        sidebar.addEventListener('transitionend', () => {
            if (window.instance) {
                window.instance.repaintEverything();
            }
        });
    }
    
    // Initialize sidebar as collapsed on mobile by default
    if (window.innerWidth <= 768) {
        sidebar.classList.add('collapsed');
        if (toggleIcon) toggleIcon.textContent = '▼';
    }
}

// Function to handle resize events
function handleResize() {
    const sidebar = document.querySelector('.sidebar');
    const workspace = document.getElementById('workspace');
    const toggleIcon = document.querySelector('.toggle-icon');
    
    if (window.innerWidth <= 768) {
        // Mobile view: ensure workspace interaction is enabled only when sidebar is collapsed
        if (workspace) {
            workspace.style.pointerEvents = sidebar.classList.contains('collapsed') ? 'auto' : 'none';
        }
        
        // Adjust zoom controls position to avoid sidebar
        const zoomControls = document.querySelector('.zoom-controls');
        if (zoomControls) {
            zoomControls.style.bottom = sidebar.classList.contains('collapsed') ? '60px' : '10px';
        }
    } else {
        // Desktop view: always enable workspace interaction
        if (workspace) {
            workspace.style.pointerEvents = 'auto';
        }
        
        // Reset sidebar if switching from mobile to desktop
        if (sidebar.classList.contains('collapsed')) {
            sidebar.classList.remove('collapsed');
            if (toggleIcon) toggleIcon.textContent = '▼';
        }
        
        // Reset zoom controls position
        const zoomControls = document.querySelector('.zoom-controls');
        if (zoomControls) {
            zoomControls.style.bottom = '20px';
        }
    }
    
    // Ensure jsPlumb repaints connections on resize
    if (window.instance) {
        window.instance.repaintEverything();
    }
}
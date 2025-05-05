// zoomPan.js - Handles workspace zoom and pan functionality

// Default zoom settings
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

export function setupZoomPan(jsPlumbInstance) {
    const workspace = document.getElementById('workspace');
    
    // Create a container inside the workspace that will be scaled
    const zoomContainer = document.createElement('div');
    zoomContainer.id = 'zoom-container';
    zoomContainer.style.position = 'absolute';
    zoomContainer.style.width = '100%';
    zoomContainer.style.height = '100%';
    zoomContainer.style.transformOrigin = '0 0';
    
    // Move all existing workspace children to zoomContainer
    // Save a reference to the children before moving them
    const workspaceChildren = Array.from(workspace.children);
    workspaceChildren.forEach(child => {
        // Only move elements that are not the zoom controls
        if (!child.classList || !child.classList.contains('zoom-controls')) {
            zoomContainer.appendChild(child);
        }
    });
    
    // Add the zoom container to workspace
    workspace.appendChild(zoomContainer);
    
    // Set jsPlumb container to the zoom container
    jsPlumbInstance.setContainer(zoomContainer);
    
    // Track zoom level and pan position
    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    let isPanning = false;
    let startX, startY;
    
    // Add zoom controls to the workspace
    addZoomControls(workspace);
    
    // Handle mouse wheel for zooming
    workspace.addEventListener('wheel', (e) => {
        // Prevent the default scroll behavior
        e.preventDefault();
        
        // Calculate new scale
        const direction = e.deltaY < 0 ? 1 : -1;
        const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale + direction * ZOOM_STEP));
        
        // If scale didn't change, exit
        if (newScale === scale) return;
        
        // Calculate mouse position relative to the workspace
        const rect = workspace.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Calculate new translate values to zoom toward mouse position
        const dx = mouseX - translateX;
        const dy = mouseY - translateY;
        const scaleDiff = newScale / scale;
        translateX = mouseX - dx * scaleDiff;
        translateY = mouseY - dy * scaleDiff;
        
        // Update scale
        scale = newScale;
        
        // Apply transform
        applyTransform();
        
        // Update jsPlumb
        jsPlumbInstance.setZoom(scale);
    });
    
    // Handle middle mouse button panning
    workspace.addEventListener('mousedown', (e) => {
        // Middle mouse button (button 1) or space + left mouse button
        if (e.button === 1 || (e.button === 0 && e.getModifierState('Space'))) {
            isPanning = true;
            startX = e.clientX;
            startY = e.clientY;
            workspace.style.cursor = 'grabbing';
            e.preventDefault();
        }
    });
    
    workspace.addEventListener('mousemove', (e) => {
        if (isPanning) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            translateX += dx;
            translateY += dy;
            
            applyTransform();
            
            startX = e.clientX;
            startY = e.clientY;
            e.preventDefault();
        }
    });
    
    const endPanning = () => {
        if (isPanning) {
            isPanning = false;
            workspace.style.cursor = 'default';
        }
    };
    
    workspace.addEventListener('mouseup', endPanning);
    workspace.addEventListener('mouseleave', endPanning);
    
    // Add keyboard shortcuts for zoom
    document.addEventListener('keydown', (e) => {
        // Only handle if no input is focused
        if (document.activeElement.tagName === 'INPUT' || 
            document.activeElement.tagName === 'TEXTAREA') {
            return;
        }
        
        // Zoom in with '+'
        if ((e.key === '+' || e.key === '=') && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            zoomIn();
        }
        
        // Zoom out with '-'
        if (e.key === '-' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            zoomOut();
        }
        
        // Reset zoom with '0'
        if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            resetZoom();
        }
    });
    
    // Function to apply current transform
    function applyTransform() {
        zoomContainer.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        updateZoomDisplay();
    }
    
    // Functions for zoom controls
    function zoomIn() {
        const newScale = Math.min(MAX_ZOOM, scale + ZOOM_STEP);
        if (newScale !== scale) {
            scale = newScale;
            applyTransform();
            jsPlumbInstance.setZoom(scale);
        }
    }
    
    function zoomOut() {
        const newScale = Math.max(MIN_ZOOM, scale - ZOOM_STEP);
        if (newScale !== scale) {
            scale = newScale;
            applyTransform();
            jsPlumbInstance.setZoom(scale);
        }
    }
    
    function resetZoom() {
        scale = 1;
        translateX = 0;
        translateY = 0;
        applyTransform();
        jsPlumbInstance.setZoom(1);
    }
    
    // Create zoom controls
    function addZoomControls(workspace) {
        const controls = document.createElement('div');
        controls.className = 'zoom-controls';
        
        const zoomInBtn = document.createElement('button');
        zoomInBtn.innerHTML = '+';
        zoomInBtn.title = 'Zoom In (Ctrl/Cmd +)';
        zoomInBtn.className = 'zoom-btn zoom-in-btn';
        zoomInBtn.addEventListener('click', zoomIn);
        
        const zoomOutBtn = document.createElement('button');
        zoomOutBtn.innerHTML = '-';
        zoomOutBtn.title = 'Zoom Out (Ctrl/Cmd -)';
        zoomOutBtn.className = 'zoom-btn zoom-out-btn';
        zoomOutBtn.addEventListener('click', zoomOut);
        
        const resetBtn = document.createElement('button');
        resetBtn.innerHTML = '↺';
        resetBtn.title = 'Reset Zoom (Ctrl/Cmd 0)';
        resetBtn.className = 'zoom-btn zoom-reset-btn';
        resetBtn.addEventListener('click', resetZoom);
        
        const zoomDisplay = document.createElement('span');
        zoomDisplay.className = 'zoom-display';
        zoomDisplay.innerHTML = '100%';
        zoomDisplay.id = 'zoom-percentage';
        
        controls.appendChild(zoomOutBtn);
        controls.appendChild(zoomDisplay);
        controls.appendChild(zoomInBtn);
        controls.appendChild(resetBtn);
        
        workspace.appendChild(controls);
    }
    
    // Update zoom percentage display
    function updateZoomDisplay() {
        const zoomDisplay = document.getElementById('zoom-percentage');
        if (zoomDisplay) {
            zoomDisplay.innerHTML = `${Math.round(scale * 100)}%`;
        }
    }
    
    // Add a method to handle new nodes for panning
    function addNodeToZoomContainer(node) {
        if (zoomContainer && node) {
            zoomContainer.appendChild(node);
            return true;
        }
        return false;
    }
    
    // Return exposed methods for external access
    return {
        zoomIn,
        zoomOut,
        resetZoom,
        getScale: () => scale,
        addNodeToZoomContainer // Expose this method to add new nodes to the container
    };
}
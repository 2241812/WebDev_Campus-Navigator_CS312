/**
 * @namespace App
 * @description Main application namespace.
 */
window.App = {
    /**
     * @type {object}
     * @description Holds the map data (nodes, edges, floor plans) loaded from the server.
     */
    mapData: { nodes: [], edges: [] }
};

/**
 * @function initializeApp
 * @description Main function to initialize the entire application after map data is loaded.
 * Sets up DOM references, state, config, and all modules.
 */
function initializeApp() {
    /**
     * @namespace App.DOM
     * @description Caches references to all required DOM elements for performance.
     */
    App.DOM = {
        findPathBtn: document.getElementById('findPathBtn'),
        mapSvg: document.getElementById('mapSvg'),
        pathContainer: null, // Dynamically created in loadFloorVisuals
        edgeContainer: null, // Dynamically created in loadFloorVisuals
        nodeContainer: null, // Dynamically created in loadFloorVisuals
        
        mapContainer: document.getElementById('mapContainer'),
        pathInstructions: document.getElementById('pathInstructions'),
        adminPanel: document.getElementById('adminPanel'),
        adminStatus: document.getElementById('adminStatus'),
        floorSelector: document.getElementById('floorSelector'),
        modal: document.getElementById('confirmationModal'),
        modalTitle: document.getElementById('modalTitle'),
        modalMessage: document.getElementById('modalMessage'),
        modalCancelBtn: document.getElementById('modalCancelBtn'),
        modalConfirmBtn: document.getElementById('modalConfirmBtn'),
        
        roleSelector: document.getElementById('roleSelector'),
        selectedStartDisplay: document.getElementById('selectedStartDisplay'),
        selectedEndDisplay: document.getElementById('selectedEndDisplay'),
        
        mapLegendHeader: document.getElementById('mapLegendHeader')
    };

    /**
     * @namespace App.Config
     * @description Centralized configuration for styles, weights, and other constants.
     */
    App.Config = {
        // Node Radii
        ROOM_RADIUS: 7,
        HALLWAY_RADIUS: 5,
        CONNECTOR_RADIUS: 10, // Stairs & Elevators

        // SVG Styles
        EDGE_STROKE: '#4A5568',
        EDGE_STROKE_WIDTH: 2,

        // Pathfinding Weights
        STAIR_WEIGHT: 15,
        ELEVATOR_WEIGHT: 25,

        // Misc
        DEFAULT_VIEWBOX: '0 0 800 500',
        UPDATE_POLL_INTERVAL: 5000 // 5 seconds
    };

    /**
     * @namespace App.State
     * @description Holds the volatile state of the application (e.g., current selections, role).
     */
    App.State = {
        currentFloor: 1,
        currentRole: 'student',
        modalConfirmCallback: null,
        selectedStartId: null,
        selectedEndId: null,
        mapLastUpdated: null // Used by UpdateChecker
    };

    /**
     * @namespace App.Modal
     * @description Manages showing and hiding the confirmation modal.
     */
    App.Modal = {
        /**
         * Shows the modal with a specific message and confirmation callback.
         * @param {string} title - The title for the modal.
         * @param {string} message - The body message for the modal.
         * @param {function} onConfirm - The function to execute when the confirm button is clicked.
         */
        show: (title, message, onConfirm) => {
            App.DOM.modalTitle.textContent = title;
            App.DOM.modalMessage.textContent = message;
            App.State.modalConfirmCallback = onConfirm;
            App.DOM.modal.style.display = 'flex';
        },
        /**
         * Hides the modal and clears the confirmation callback.
         */
        hide: () => {
            App.DOM.modal.style.display = 'none';
            App.State.modalConfirmCallback = null;
        }
    };

    /**
     * @namespace App.RoleManager
     * @description Handles role switching and permission checks.
     */
    App.RoleManager = {
        /**
         * @property {object} roles - Defines the properties and access rules for each role.
         */
        roles: {
            'student': { label: 'Student', isNodeAccessible: (node) => node.access !== 'employee' },
            'pwd-student': { label: 'PWD Student', isNodeAccessible: (node) => node.type !== 'stairs' && node.access !== 'employee' },
            'employee': { label: 'Employee', isNodeAccessible: (node) => true },
            'admin': { label: 'Admin', isNodeAccessible: (node) => true }
        },

        /**
         * Sets the application's current role.
         * @param {string} newRole - The key of the role to switch to (e.g., 'student', 'admin').
         */
        setRole: (newRole) => {
            if (!App.RoleManager.roles[newRole]) return;
            
            App.State.currentRole = newRole;
            const isAdmin = (newRole === 'admin');
            
            // Adjust layout based on admin panel visibility
            const mainContentWrapper = document.getElementById('mainContentWrapper');
            if (isAdmin) {
                mainContentWrapper.classList.remove('justify-center');
            } else {
                mainContentWrapper.classList.add('justify-center');
            }

            App.DOM.adminPanel.classList.toggle('hidden', !isAdmin);

            // Update active state on role buttons
            document.querySelectorAll('.role-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.role === newRole);
            });

            // Initialize or shut down the admin editor
            if (isAdmin && typeof App.AdminEditor !== 'undefined') {
                App.AdminEditor.init();
            } else if (typeof App.AdminEditor !== 'undefined') {
                App.AdminEditor.shutdown();
            }
            
            App.Pathfinder.clearHighlights();
            App.Renderer.redrawMapElements(); // Redraw to apply new role-based styles/rules
        },

        /**
         * Checks if a given node is accessible to the current user role.
         * @param {object} node - The node object to check.
         * @returns {boolean} True if the node is accessible, false otherwise.
         */
        isNodeAccessible: (node) => {
            const strategy = App.RoleManager.roles[App.State.currentRole];
            if (!strategy) return false;
            return strategy.isNodeAccessible(node);
        }
    };

    /**
     * @namespace App.Renderer
     * @description Handles all rendering logic for the SVG map and UI components.
     */
    App.Renderer = {
        /**
         * Creates the role-switching buttons based on App.RoleManager.roles.
         */
        createRoleButtons: () => {
            App.DOM.roleSelector.innerHTML = '';
            for (const [roleId, roleData] of Object.entries(App.RoleManager.roles)) {
                const button = document.createElement('button');
                button.textContent = roleData.label;
                button.className = 'role-btn';
                button.dataset.role = roleId;
                button.onclick = () => App.RoleManager.setRole(roleId);
                App.DOM.roleSelector.appendChild(button);
            }
        },

        /**
         * Updates the floor-switching buttons based on available floors in mapData.
         */
        updateFloorButtons: () => {
            App.DOM.floorSelector.innerHTML = '';
            const floors = [...new Set(App.mapData.nodes.map(n => n.floor))].sort((a,b) => a-b);
            floors.forEach(floorNum => {
                const label = (App.mapData.floorLabels && App.mapData.floorLabels[floorNum]) ? App.mapData.floorLabels[floorNum] : `Floor ${floorNum}`;
                const button = document.createElement('button');
                button.textContent = label;
                button.className = `px-4 py-2 rounded-md text-sm font-medium transition ${App.State.currentFloor === floorNum ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`;
                button.onclick = () => App.Renderer.switchFloor(floorNum);
                App.DOM.floorSelector.appendChild(button);
            });
        },

        /**
         * Switches the application to a different floor.
         * @param {number} floorNum - The floor number to switch to.
         */
        switchFloor: (floorNum) => {
            // Fallback if the requested floor doesn't exist
            if (!App.mapData.nodes.some(n => n.floor === floorNum)) {
                 const floors = [...new Set(App.mapData.nodes.map(n => n.floor))].sort((a,b) => a-b);
                 floorNum = floors.length > 0 ? floors[0] : 1;
            }
            App.State.currentFloor = floorNum;

            // Fade out, load new content, fade in
            App.DOM.mapContainer.style.opacity = '0';
            setTimeout(() => {
                App.Renderer.loadFloorVisuals(); // This does the heavy lifting
                App.Renderer.updateFloorButtons();
                App.DOM.mapContainer.style.opacity = '1';
            }, 300); // 300ms matches the CSS transition
        },
        
        /**
         * Populates the start/end dropdown selectors (if they exist).
         * This function appears to be a stub or placeholder in the original code.
         */
        populateSelectors: () => {
             if (App.mapData.nodes.filter(n => n.type === 'room').length === 0) {
                App.Pathfinder.clearHighlights();
             }
        },

        /**
         * Updates the "Selected Start" and "Selected End" UI text.
         */
        updatePathUI: () => {
            const getFloorLabel = (floorNum) => (App.mapData.floorLabels && App.mapData.floorLabels[floorNum]) ? App.mapData.floorLabels[floorNum] : `F${floorNum}`;
            
            const startNode = App.mapData.nodes.find(n => n.id === App.State.selectedStartId);
            const endNode = App.mapData.nodes.find(n => n.id === App.State.selectedEndId);

            App.DOM.selectedStartDisplay.textContent = startNode ? `${startNode.name} (${getFloorLabel(startNode.floor)})` : 'None';
            App.DOM.selectedEndDisplay.textContent = endNode ? `${endNode.name} (${getFloorLabel(endNode.floor)})` : 'None';
            
            // Update instructional text
            if (!startNode) {
                App.DOM.pathInstructions.innerHTML = '<p class="text-gray-500">Click a room on the map to select a start point.</p>';
            } else if (!endNode) {
                App.DOM.pathInstructions.innerHTML = '<p class="text-gray-500">Click a room on the map to select a destination.</p>';
            }
        },
 
       /**
        * Draws all nodes and edges for the given floor into the SVG containers.
        * @param {number} floor - The floor number to draw.
        */
       drawMapElements: (floor) => {
            const isAdmin = App.State.currentRole === 'admin';
            
            // Filter map data for the current floor
            const nodesToDraw = App.mapData.nodes.filter(n => n.floor === floor);
            const edgesToDraw = App.mapData.edges.filter(edge => {
                const sourceNode = App.mapData.nodes.find(n => n.id === edge.source);
                const targetNode = App.mapData.nodes.find(n => n.id === edge.target);
                return sourceNode && targetNode && sourceNode.floor === floor && targetNode.floor === floor;
            });

            // Draw edges
            edgesToDraw.forEach(edge => {
                const sourceNode = App.mapData.nodes.find(n => n.id === edge.source);
                const targetNode = App.mapData.nodes.find(n => n.id === edge.target);
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');

                line.setAttribute('x1', Number(sourceNode.x)); 
                line.setAttribute('y1', Number(sourceNode.y));
                line.setAttribute('x2', Number(targetNode.x)); 
                line.setAttribute('y2', Number(targetNode.y));

                line.setAttribute('stroke', App.Config.EDGE_STROKE); 
                line.setAttribute('stroke-width', App.Config.EDGE_STROKE_WIDTH);
                line.classList.add('edge');
                App.DOM.edgeContainer.appendChild(line);
            });

            // Draw nodes
            nodesToDraw.forEach(node => {
                const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                group.setAttribute('id', `g-${node.id}`);
                group.classList.add('node-label-group');
                
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('id', node.id); 
                circle.setAttribute('cx', Number(node.x)); 
                circle.setAttribute('cy', Number(node.y));
                
                // Set radius based on node type
                let radius;
                switch(node.type) {
                    case 'room':
                        radius = App.Config.ROOM_RADIUS;
                        break;
                    case 'hallway':
                        radius = App.Config.HALLWAY_RADIUS;
                        break;
                    default: // stairs, elevator
                        radius = App.Config.CONNECTOR_RADIUS;
                }
                circle.setAttribute('r', radius);
                
                let nodeClass = `node ${node.type}`;
                
                // Add role-specific classes and interactions
                if (isAdmin) {
                    nodeClass += ' draggable';
                    if (typeof App.AdminEditor !== 'undefined' && App.AdminEditor.editMode.firstNodeId === node.id) {
                        nodeClass += ' selected-for-action';
                    }
                } else {
                    if (node.type === 'room') {
                        nodeClass += ' path-selectable';
                    }
                    // Highlight selected start/end nodes
                    if (node.id === App.State.selectedStartId) {
                        nodeClass += ' start-node-selected';
                    } else if (node.id === App.State.selectedEndId) {
                        nodeClass += ' end-node-selected';
                    }
                }

                if (node.type === 'elevator' && node.access === 'employee') {
                    nodeClass += ' elevator-employee';
                }
                
                circle.setAttribute('class', nodeClass);
                group.appendChild(circle);

               // Add labels for rooms
               if (node.type === 'room') {
                    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    text.setAttribute('x', Number(node.x)); 
                    text.setAttribute('y', Number(node.y) + 20); // Label offset
                    text.setAttribute('class', 'node-label'); 
                    text.style.pointerEvents = 'none'; // Click through the label
                    text.textContent = node.name; 
                    group.appendChild(text);
                }
                
                // Add event listeners
                if(isAdmin && typeof App.AdminEditor !== 'undefined') {
                    // Admin: Dragging or Edit Mode actions
                    group.addEventListener('mousedown', (e) => { 
                        e.stopPropagation(); 
                        if (App.AdminEditor.editMode.mode) {
                            App.AdminEditor.handleMapClick(e);
                        } else {
                            App.AdminEditor.startDrag(e, node.id); 
                        }
                    });
                } else if (!isAdmin) {
                    // Student: Path selection
                    group.addEventListener('click', (e) => {
                        e.stopPropagation();
                        App.Pathfinder.handleNodeSelection(node.id);
                    });
                }
                App.DOM.nodeContainer.appendChild(group);
            });
        },
        
      /**
       * Clears and redraws all SVG elements.
       * Called after role change, node selection, or path clearing.
       */
      redrawMapElements: () => {
            // Safety check: Don't run if containers haven't been created yet
            if (!App.DOM.nodeContainer || !App.DOM.edgeContainer) {
                return;
            }

            // Clear existing elements
            App.DOM.nodeContainer.innerHTML = '';
            App.DOM.edgeContainer.innerHTML = '';
            
            // Redraw for the current floor
            App.Renderer.drawMapElements(App.State.currentFloor);
        },

        /**
         * Loads the floorplan image and initializes SVG layers for the current floor.
         */
        loadFloorVisuals: () => {
            App.DOM.mapSvg.innerHTML = ''; // Clear the entire SVG
            const floor = App.State.currentFloor;
            
            // Fallback if no nodes exist for any floor
            if (!App.mapData.nodes.some(n => n.floor === floor)) {
                 App.DOM.mapSvg.setAttribute('viewBox', App.Config.DEFAULT_VIEWBOX);
                 App.DOM.mapSvg.innerHTML = '<text x="400" y="250" text-anchor="middle" fill="white" font-size="20">No floors exist. Add a floor in admin panel.</text>';
                 return;
            }

            // Create the floorplan image element first (it will be the bottom layer)
            const imageEl = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            App.DOM.mapSvg.appendChild(imageEl);

            // Create and append layer groups IN ORDER (back to front)
            // This ensures paths draw on top of floorplan, edges on top of paths, etc.
            App.DOM.pathContainer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            App.DOM.pathContainer.setAttribute('id', 'path-container');
            App.DOM.mapSvg.appendChild(App.DOM.pathContainer);
            
            App.DOM.edgeContainer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            App.DOM.edgeContainer.setAttribute('id', 'edge-container');
            App.DOM.mapSvg.appendChild(App.DOM.edgeContainer);
            
            App.DOM.nodeContainer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            App.DOM.nodeContainer.setAttribute('id', 'node-container');
            App.DOM.mapSvg.appendChild(App.DOM.nodeContainer);
            
            // --- Image Loading Logic ---
            const dataUrl = (App.mapData.floorPlans && App.mapData.floorPlans[floor])
                ? App.mapData.floorPlans[floor]
                : null;

            if (!dataUrl) {
                console.warn(`No floorplan image found for floor ${floor}.`);
                App.DOM.mapSvg.setAttribute('viewBox', App.Config.DEFAULT_VIEWBOX);
                App.Renderer.drawMapElements(floor); // Draw elements into their containers
                return;
            }

            // Load the image to get its natural dimensions for the viewBox
            const img = new Image();
            img.onload = () => {
                const vb = `0 0 ${img.naturalWidth} ${img.naturalHeight}`;
                App.DOM.mapSvg.setAttribute('viewBox', vb);
                
                // Set attributes for the image element we already added
                imageEl.setAttribute('href', img.src);
                imageEl.setAttribute('x', '0');
                imageEl.setAttribute('y', '0');
                imageEl.setAttribute('width', img.naturalWidth);
                imageEl.setAttribute('height', img.naturalHeight);
                
                App.Renderer.drawMapElements(floor); // Now draw elements on top
            };
            
            img.onerror = () => {
                console.error(`Failed to load floorplan image from data URL for floor ${floor}.`);
                App.DOM.mapSvg.setAttribute('viewBox', App.Config.DEFAULT_VIEWBOX);
                App.Renderer.drawMapElements(floor); // Still draw nodes/edges
            };
            
            img.src = dataUrl;
        }
    };
    
    /**
     * @namespace App.Pathfinder
     * @description Handles pathfinding logic (Dijkstra) and path visualization.
     */
    App.Pathfinder = {
       /**
        * Calculates the weight (cost) between two adjacent nodes.
        * @param {object} sourceNode - The starting node.
        * @param {object} targetNode - The ending node.
        * @returns {number} The calculated weight.
        */
        // Inside App.Pathfinder
        getWeight: (sourceNode, targetNode) => {
            // 1. Inter-floor travel (remains the same)
            if (sourceNode.floor !== targetNode.floor) {
                if (sourceNode.type === 'stairs' && targetNode.type === 'stairs') return App.Config.STAIR_WEIGHT;
                if (sourceNode.type === 'elevator' && targetNode.type === 'elevator') return App.Config.ELEVATOR_WEIGHT;
                return Infinity; // Should not happen if data is clean
            }
            
            // 2. Intra-floor travel (on the same floor)
            
        
            if (sourceNode.type === 'stairs' || targetNode.type === 'stairs') {
                return App.Config.STAIR_WEIGHT;
            }
            if (sourceNode.type === 'elevator' || targetNode.type === 'elevator') {
                return App.Config.ELEVATOR_WEIGHT;
            }
        
            // This code now ONLY runs if both nodes are normal (e.g., room, hallway).
            const dx = parseFloat(sourceNode.x) - parseFloat(targetNode.x);
            const dy = parseFloat(sourceNode.y) - parseFloat(targetNode.y);

            const dist = Math.round(Math.hypot(dx, dy) / 10);
            return isNaN(dist) ? 1 : Math.max(1, dist); // Ensure weight is at least 1
        },

        /**
         * Finds the shortest path between two nodes using Dijkstra's algorithm.
         * @param {string} startId - The ID of the starting node.
         * @param {string} endId - The ID of the ending node.
         * @returns {Array<string>|null} An array of node IDs representing the path, or null if no path is found.
         */
        findShortestPath: (startId, endId) => {
            const distances = {}; // Shortest distance from start to node
            const previous = {};  // Previous node in optimal path
            const pq = new Map(); // Priority queue (simulated with a Map)
            
            App.mapData.nodes.forEach(node => { 
                distances[node.id] = Infinity; 
                previous[node.id] = null; 
                pq.set(node.id, Infinity); 
            });
            
            distances[startId] = 0; 
            pq.set(startId, 0);
            
            const isNodeAccessible = App.RoleManager.isNodeAccessible;

            while (pq.size > 0) {
                // Find node with smallest distance in priority queue
                let closestNodeId = null; 
                let minDistance = Infinity;
                for (const [nodeId, dist] of pq.entries()) { 
                    if (dist < minDistance) { 
                        minDistance = dist; 
                        closestNodeId = nodeId; 
                    } 
                }

                // Path found or no path possible
                if (closestNodeId === endId || closestNodeId === null || distances[closestNodeId] === Infinity) {
                    break;
                }
                
                const closestNode = App.mapData.nodes.find(n => n.id === closestNodeId);
                pq.delete(closestNodeId);

                // Skip inaccessible nodes
                if (!isNodeAccessible(closestNode)) {
                    continue;
                }
                
                // Get all edges connected to the current node
                const neighbors = App.mapData.edges.filter(edge => edge.source === closestNodeId || edge.target === closestNodeId);
                
                for (const edge of neighbors) {
                    const neighborId = edge.source === closestNodeId ? edge.target : edge.source;
                    const neighborNode = App.mapData.nodes.find(n => n.id === neighborId);
                    
                    // Skip if neighbor doesn't exist or is inaccessible
                    if (!neighborNode || !isNodeAccessible(neighborNode)) {
                        continue;
                    }
                    
                    const newDist = distances[closestNodeId] + App.Pathfinder.getWeight(closestNode, neighborNode);
                    
                    if (newDist < distances[neighborId]) {
                        // New shorter path found
                        distances[neighborId] = newDist;
                        previous[neighborId] = closestNodeId;
                        if (pq.has(neighborId)) { 
                            pq.set(neighborId, newDist); 
                        }
                    }
                }
            }
            
            // Reconstruct the path
            const path = []; 
            let currentNode = endId;
            while (currentNode) { 
                path.unshift(currentNode); 
                currentNode = previous[currentNode]; 
            }
            
            // Return path only if it starts with the startId
            return path[0] === startId ? path : null;
        },

        /**
         * Highlights two nodes in the SVG when a text instruction is clicked.
         * @param {string} fromId - The ID of the "from" node.
         * @param {string} toId - The ID of the "to" node.
         */
        highlightStep: (fromId, toId) => {
            // Clear any previous step highlights
            document.querySelectorAll('.step-highlight').forEach(el => el.classList.remove('step-highlight'));

            // Find the new elements by their ID
            const fromEl = document.getElementById(fromId);
            const toEl = document.getElementById(toId);

            // Add the new highlight class
            if (fromEl) fromEl.classList.add('step-highlight');
            if (toEl) toEl.classList.add('step-highlight');
        },

        /**
         * Event handler for the "Find Path" button.
         */
        handleFindPath: () => {
            App.Pathfinder.clearHighlights(false); // Don't clear selections
            const startId = App.State.selectedStartId;
            const endId = App.State.selectedEndId;
            
            if (!startId || !endId) { 
                App.DOM.pathInstructions.innerHTML = '<p class="text-yellow-400">Please select start and end locations from the map.</p>'; 
                return; 
            }
            if (startId === endId) { 
                App.DOM.pathInstructions.innerHTML = '<p class="text-yellow-400">Start and end cannot be the same.</p>'; 
                return; 
            }
            
            const path = App.Pathfinder.findShortestPath(startId, endId);
            
            if (path) { 
                App.Pathfinder.animatePath(path, 0); // Start the path animation
            } else { 
                App.DOM.pathInstructions.innerHTML = '<p class="text-red-400">No path found. The route may be restricted.</p>'; 
            }
        },
        
        /**
         * Event handler for clicking on a node (in non-admin mode).
         * @param {string} nodeId - The ID of the clicked node.
         */
        handleNodeSelection: (nodeId) => {
            const node = App.mapData.nodes.find(n => n.id === nodeId);
            if (!node || node.type !== 'room') return; // Only rooms are selectable

            App.Pathfinder.clearHighlights(false); // Don't clear selections

            // Logic for selecting start/end points
            if (!App.State.selectedStartId) {
                App.State.selectedStartId = nodeId;
            } else if (!App.State.selectedEndId) {
                if (nodeId === App.State.selectedStartId) {
                    App.State.selectedStartId = null; // Deselect start
                } else {
                    App.State.selectedEndId = nodeId; // Select end
                }
            } else {
                // Both are selected, so start over
                App.State.selectedStartId = nodeId;
                App.State.selectedEndId = null;
            }

            App.Renderer.updatePathUI();
            App.Renderer.redrawMapElements(); // Redraw to show new selections
        },

        /**
         * Animates the path visualization, switching floors as needed.
         * @param {Array<string>} path - The full path (array of node IDs).
         * @param {number} pathIndex - The current index in the path array to start from.
         */
        animatePath: (path, pathIndex) => {
            if (pathIndex === 0) { 
                // Clear instructions on the first call
                App.DOM.pathInstructions.innerHTML = '<ol id="instructionList" class="list-decimal list-inside"></ol>'; 
            }
            if (pathIndex >= path.length) return; // Base case: end of path
            
            const startNode = App.mapData.nodes.find(n => n.id === path[pathIndex]);
            if (!startNode) return;
            
            // Switch to the correct floor for this segment
            App.Renderer.switchFloor(startNode.floor);
            
            // Wait for floor switch animation to finish
            setTimeout(() => {
                let segment = []; 
                let nextFloor = -1;
                
                // Find all nodes in the path that are on the current floor
                for (let i = pathIndex; i < path.length; i++) {
                    const currentNode = App.mapData.nodes.find(n => n.id === path[i]);
                    if (currentNode.floor === startNode.floor) { 
                        segment.push(path[i]); 
                    } else { 
                        nextFloor = currentNode.floor; // Found a floor change
                        break; 
                    }
                }
                
                App.Pathfinder.drawSegment(segment); // Draw this floor's segment
                
                // If there's another floor, recursively call animatePath
                if (nextFloor !== -1) { 
                    App.Pathfinder.animatePath(path, pathIndex + segment.length); 
                }
            }, 500); // Wait for floor fade
        },

       /**
        * Draws a single-floor segment of the path and generates text instructions.
        * @param {Array<string>} segment - An array of node IDs, all on the same floor.
        */
       drawSegment: (segment) => {
            if (segment.length === 0) return;
            
            const instructionList = document.getElementById('instructionList');
            if (!instructionList) return; // Safety check

            // Draw the polyline for the path
            if (segment.length > 1) {
                const points = segment
                    .map(nodeId => {
                        const node = App.mapData.nodes.find(n => n.id === nodeId);
                        if (!node || typeof node.x === 'undefined' || typeof node.y === 'undefined') {
                            console.warn('Path drawing: Skipping node with invalid coordinates:', nodeId, node);
                            return null;
                        }
                        return `${Number(node.x)},${Number(node.y)}`;
                    })
                    .filter(p => p !== null)
                    .join(' ');
                    
                const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
                polyline.setAttribute('points', points);
                polyline.setAttribute('class', 'path');
                
               App.DOM.pathContainer.appendChild(polyline);
            }
            
            // Highlight nodes on the path (except start/end)
            segment.forEach(nodeId => { 
                if (nodeId === App.State.selectedStartId || nodeId === App.State.selectedEndId) return;
                const nodeEl = document.getElementById(nodeId); 
                if (nodeEl) nodeEl.classList.add('highlight'); 
            });
            
           // Generate text instructions
           for(let i = 0; i < segment.length - 1; i++){
                const stepFrom = App.mapData.nodes.find(n => n.id === segment[i]);
                const stepTo = App.mapData.nodes.find(n => n.id === segment[i+1]);
                
                // Only create instructions for "important" steps (not hallway-to-hallway)
                if (stepFrom.type === 'hallway' && stepTo.type === 'hallway') continue;
                
                const li = document.createElement('li');
                li.innerHTML = `Go from <strong>${stepFrom.name}</strong> to <strong>${stepTo.name}</strong>`;
                
                // Add data attributes and class for interactive highlighting
                li.dataset.fromId = stepFrom.id;
                li.dataset.toId = stepTo.id;
                li.classList.add('route-step'); 
                
                // Add the click event listener
                li.addEventListener('click', () => {
                    App.Pathfinder.highlightStep(stepFrom.id, stepTo.id);
                });
                
                instructionList.appendChild(li);
            }
        },
        
        /**
         * Clears all path highlights, polylines, and instructions.
         * @param {boolean} [clearSelections=true] - Whether to also clear the start/end node selections.
         */
        clearHighlights: (clearSelections = true) => {
            // Remove path/node highlights
            document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
            document.querySelectorAll('.step-highlight').forEach(el => el.classList.remove('step-highlight'));
            
            // Clear SVG path container
            if (App.DOM.pathContainer) {
                App.DOM.pathContainer.innerHTML = '';
            }
            
            // Reset instruction text
            App.DOM.pathInstructions.innerHTML = '<p class="text-gray-500">Select a start and end point to see the route.</p>';

            if (clearSelections) {
                App.State.selectedStartId = null;
                App.State.selectedEndId = null;
                App.Renderer.updatePathUI();
            }
            
            App.Renderer.redrawMapElements(); // Redraw to remove selection classes
        }
    };

    /**
     * @namespace App.UpdateChecker
     * @description Polls the server to check for map updates made by an admin.
     */
    App.UpdateChecker = {
        /**
         * Polls the server for the latest map version timestamp.
         */
        poll: () => {
            fetch('res/api/getMapVersion.php')
                .then(response => {
                    if (!response.ok) throw new Error('Update check failed');
                    return response.json();
                })
                .then(versionData => {
                    if (!versionData.lastUpdated) return; // Do nothing on bad response

                    if (!App.State.mapLastUpdated) {
                        // First poll: just store the current time
                        App.State.mapLastUpdated = versionData.lastUpdated;
                    } else if (versionData.lastUpdated > App.State.mapLastUpdated) {
                        // New version detected!
                        App.UpdateChecker.showUpdateBar();
                        if (App.State.updateInterval) {
                            clearInterval(App.State.updateInterval); // Stop polling
                        }
                    }
                })
                .catch(err => console.warn('Update check failed:', err));
        },
        
        /**
         * Shows a "Map Updated" bar and reloads the page.
         */
        showUpdateBar: () => {
            if (document.getElementById('update-bar')) return; // Bar already exists

            const updateBar = document.createElement('div');
            updateBar.id = 'update-bar';
            updateBar.textContent = 'Map has been updated by an admin. Page will refresh...';
            
            // Apply styles
            updateBar.style.position = 'fixed';
            updateBar.style.top = '0';
            updateBar.style.left = '0';
            updateBar.style.width = '100%';
            updateBar.style.backgroundColor = '#3182CE'; // Blue
            updateBar.style.color = 'white';
            updateBar.style.padding = '1rem';
            updateBar.style.textAlign = 'center';
            updateBar.style.zIndex = '10000';
            updateBar.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            
            document.body.appendChild(updateBar);
            
            // Wait 2.5 seconds, then reload
            setTimeout(() => {
                location.reload();
            }, 2500);
        }
    };


    /**
     * @namespace App.init
     * @description Main initialization function for the App.
     */
    App.init = () => {
        // --- Attach Event Listeners ---
        App.DOM.findPathBtn.addEventListener('click', App.Pathfinder.handleFindPath);
        App.DOM.modalCancelBtn.addEventListener('click', App.Modal.hide);
        App.DOM.modalConfirmBtn.addEventListener('click', () => {
            if (App.State.modalConfirmCallback) App.State.modalConfirmCallback();
        });

        // Map Legend toggle
        if (App.DOM.mapLegendHeader) {
            App.DOM.mapLegendHeader.addEventListener('click', () => {
                const legend = document.getElementById('mapLegend');
                if (legend) {
                    legend.classList.toggle('collapsed');
                }
            });
        }

        // Main SVG click listener (for admin map clicks)
        App.DOM.mapSvg.addEventListener('click', (e) => {
            if (App.State.currentRole === 'admin' && typeof App.AdminEditor !== 'undefined') {
                if (App.AdminEditor.isDragging) return; // Don't click if dragging
                
                // Only trigger if clicking the SVG background or floorplan
                if (e.target.tagName.toLowerCase() === 'svg' || e.target.tagName.toLowerCase() === 'image') {
                     App.AdminEditor.handleMapClick(e);
                }
            }
        });
        
        // --- Initialize UI ---
        App.Renderer.populateSelectors();
        App.Renderer.createRoleButtons();
        App.Renderer.updateFloorButtons();
        App.Renderer.switchFloor(1); // Load the first floor
        App.RoleManager.setRole(App.State.currentRole); // Set default role
        App.Renderer.updatePathUI();

        // --- Start Polling ---
        // Only start polling for updates if not an admin
        if (App.State.currentRole !== 'admin') {
           App.State.updateInterval = setInterval(App.UpdateChecker.poll, App.Config.UPDATE_POLL_INTERVAL);
        }
    };
    
    // Run the app initialization
    App.init();
}

/**
 * @event DOMContentLoaded
 * @description Entry point. Waits for the DOM to be ready, then fetches map data
 * and boots the application.
 */
document.addEventListener('DOMContentLoaded', () => {
   fetch('res/api/getData.php')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            App.mapData = data; // Store the loaded data
            initializeApp();    // Initialize the application
        })
        .catch(error => {
            // Fatal error: App can't start
            console.error("Error loading map data:", error);
            const mapSvg = document.getElementById('mapSvg');
            if (mapSvg) {
                mapSvg.innerHTML = 
                    `<text x="400" y="250" text-anchor="middle" fill="red" font-size="20">
                        Error loading map data. Please check console.
                    </text>`;
            }
        });
});
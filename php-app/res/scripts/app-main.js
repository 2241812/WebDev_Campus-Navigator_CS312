window.App = {
    mapData: { nodes: [], edges: [] },
    adjacencyList: new Map()
};

function initializeApp() {
    // --- DOM ELEMENTS CACHE ---
    App.DOM = {
        findPathBtn: document.getElementById('findPathBtn'),
        mapSvg: document.getElementById('mapSvg'),
        pathContainer: null,
        edgeContainer: null,
        nodeContainer: null,
        mapContainer: document.getElementById('mapContainer'),
        pathInstructions: document.getElementById('pathInstructions'),
        adminPanel: document.getElementById('adminPanel'),
        floorSelector: document.getElementById('floorSelector'),
        modal: document.getElementById('confirmationModal'),
        modalTitle: document.getElementById('modalTitle'),
        modalMessage: document.getElementById('modalMessage'),
        modalCancelBtn: document.getElementById('modalCancelBtn'),
        modalConfirmBtn: document.getElementById('modalConfirmBtn'),
        roleSelector: document.getElementById('roleSelector'),
        selectedStartDisplay: document.getElementById('selectedStartDisplay'),
        selectedEndDisplay: document.getElementById('selectedEndDisplay'),
        mapLegendHeader: document.getElementById('mapLegendHeader'),
        mapLegend: document.getElementById('mapLegend')
    };

    // --- CONFIGURATION (THEME COLORS) ---
    App.Config = {
        ROOM_RADIUS: 6,
        HALLWAY_RADIUS: 4,
        CONNECTOR_RADIUS: 8,
        EDGE_STROKE: '#9F987C', // Brand Light
        EDGE_STROKE_WIDTH: 2,
        PATH_COLOR: '#E4B31E',  // Brand Gold
        STAIR_WEIGHT: 15,
        ELEVATOR_WEIGHT: 25,
        DEFAULT_VIEWBOX: '0 0 800 500'
    };

    // --- APP STATE ---
    App.State = {
        currentFloor: 1,
        currentRole: 'student',
        isAdminLoggedIn: false, 
        modalConfirmCallback: null,
        selectedStartId: null,
        selectedEndId: null,
        activePath: null // Persist path across floors
    };

    // --- UTILITIES ---
    App.Utils = {
        buildGraphMap: () => {
            App.adjacencyList.clear();
            App.mapData.nodes.forEach(node => App.adjacencyList.set(node.id, []));
            App.mapData.edges.forEach(edge => {
                if (App.adjacencyList.has(edge.source)) App.adjacencyList.get(edge.source).push(edge.target);
                if (App.adjacencyList.has(edge.target)) App.adjacencyList.get(edge.target).push(edge.source);
            });
        }
    };

    // --- MODAL MANAGER ---
    App.Modal = {
        show: (title, message, onConfirm) => {
            App.DOM.modalTitle.textContent = title;
            App.DOM.modalMessage.textContent = message;
            App.State.modalConfirmCallback = onConfirm;
            App.DOM.modal.style.display = 'flex';
        },
        hide: () => {
            App.DOM.modal.style.display = 'none';
            App.State.modalConfirmCallback = null;
        }
    };

    // --- ROLE MANAGER ---
    App.RoleManager = {
        roles: {
            'student': { label: 'Student', isNodeAccessible: (node) => node.access !== 'employee' },
            'pwd-student': { label: 'PWD Student', isNodeAccessible: (node) => node.type !== 'stairs' && node.access !== 'employee' },
            'employee': { label: 'Employee', isNodeAccessible: () => true },
            'admin': { label: 'Admin', isNodeAccessible: () => true }
        },

        setRole: (newRole) => {
            if (!App.RoleManager.roles[newRole]) return;
            
            App.State.currentRole = newRole;
            const isAdmin = (newRole === 'admin');
            
            // Toggle CSS class for Admin Mode (Controls Zoom/Edit Visibility)
            if (isAdmin) {
                document.body.classList.add('admin-mode');
                // Re-init Admin listeners if they exist
                if (typeof App.AdminEditor !== 'undefined' && App.AdminEditor.init) {
                    App.AdminEditor.init();
                }
            } else {
                document.body.classList.remove('admin-mode');
                // Kill Admin listeners to prevent conflicts
                if (typeof App.AdminEditor !== 'undefined' && App.AdminEditor.shutdown) {
                    App.AdminEditor.shutdown();
                }
            }

            App.DOM.adminPanel.classList.toggle('hidden', !isAdmin);

            document.querySelectorAll('.role-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.role === newRole);
            });

            App.Pathfinder.clearHighlights();
            App.Renderer.redrawMapElements();
        },

        isNodeAccessible: (node) => {
            const strategy = App.RoleManager.roles[App.State.currentRole];
            return strategy ? strategy.isNodeAccessible(node) : false;
        }
    };

    // --- RENDERER (DRAWING LOGIC) ---
    App.Renderer = {
        createRoleButtons: () => {
            App.DOM.roleSelector.innerHTML = '';
            const fragment = document.createDocumentFragment();
            Object.entries(App.RoleManager.roles).forEach(([roleId, roleData]) => {
                if (roleId === 'admin' && !App.State.isAdminLoggedIn) return; 

                const button = document.createElement('button');
                button.textContent = roleData.label;
                button.className = 'role-btn';
                button.dataset.role = roleId;
                button.onclick = () => App.RoleManager.setRole(roleId);
                fragment.appendChild(button);
            });
            App.DOM.roleSelector.appendChild(fragment);
        },

        updateFloorButtons: () => {
            App.DOM.floorSelector.innerHTML = '';
            const floors = [...new Set(App.mapData.nodes.map(n => n.floor))].sort((a,b) => a-b);
            const fragment = document.createDocumentFragment();
            
            floors.forEach(floorNum => {
                const label = (App.mapData.floorLabels && App.mapData.floorLabels[floorNum]) ? App.mapData.floorLabels[floorNum] : `Floor ${floorNum}`;
                const button = document.createElement('button');
                button.textContent = label;
                
                const isActive = App.State.currentFloor === floorNum;
                button.className = `px-4 py-2 rounded-lg text-sm font-bold transition shadow-md ${
                    isActive 
                    ? 'bg-brand-blue text-white ring-2 ring-sky-400' 
                    : 'bg-brand-olive hover:bg-brand-muted text-gray-200'
                }`;
                
                button.onclick = () => App.Renderer.switchFloor(floorNum);
                fragment.appendChild(button);
            });
            App.DOM.floorSelector.appendChild(fragment);
        },

        switchFloor: (floorNum) => {
            // Validate floor exists
            if (!App.mapData.nodes.some(n => n.floor === floorNum)) {
                 const floors = [...new Set(App.mapData.nodes.map(n => n.floor))].sort((a,b) => a-b);
                 if(floors.length > 0) floorNum = floors[0];
            }
            App.State.currentFloor = floorNum;

            // Fade transition
            App.DOM.mapContainer.style.opacity = '0';
            setTimeout(() => {
                App.Renderer.loadFloorVisuals();
                App.Renderer.updateFloorButtons();
                App.DOM.mapContainer.style.opacity = '1';
                
                // Hide marker initially on floor switch (it reappears if path active)
                const marker = document.getElementById('userMarker');
                if (marker) marker.style.display = 'none';
            }, 300);
        },
        
        populateSelectors: () => {
             if (App.mapData.nodes.filter(n => n.type === 'room').length === 0) {
                App.Pathfinder.clearHighlights();
             }
        },

        updatePathUI: () => {
            const getFloorLabel = (floorNum) => (App.mapData.floorLabels && App.mapData.floorLabels[floorNum]) ? App.mapData.floorLabels[floorNum] : `F${floorNum}`;
            const startNode = App.mapData.nodes.find(n => n.id === App.State.selectedStartId);
            const endNode = App.mapData.nodes.find(n => n.id === App.State.selectedEndId);

            App.DOM.selectedStartDisplay.textContent = startNode ? `${startNode.name} (${getFloorLabel(startNode.floor)})` : 'Select on Map';
            App.DOM.selectedEndDisplay.textContent = endNode ? `${endNode.name} (${getFloorLabel(endNode.floor)})` : 'Select on Map';
            
            App.DOM.selectedStartDisplay.className = startNode ? "text-md font-bold text-brand-gold" : "text-md font-bold text-white";
            App.DOM.selectedEndDisplay.className = endNode ? "text-md font-bold text-brand-gold" : "text-md font-bold text-white";

            if (!startNode) {
                App.DOM.pathInstructions.innerHTML = '<p class="text-gray-500 italic">Click a room on the map to start.</p>';
            } else if (!endNode) {
                App.DOM.pathInstructions.innerHTML = '<p class="text-gray-500 italic">Click a destination room.</p>';
            }
        },
 
        drawMapElements: (floor) => {
            const isAdmin = App.State.currentRole === 'admin';
            const nodeMap = new Map(App.mapData.nodes.map(n => [n.id, n]));
            
            const nodesToDraw = App.mapData.nodes.filter(n => n.floor === floor);
            const edgesToDraw = App.mapData.edges.filter(edge => {
                const s = nodeMap.get(edge.source);
                const t = nodeMap.get(edge.target);
                return s && t && s.floor === floor && t.floor === floor;
            });

            // 1. DRAW EDGES
            const edgeFragment = document.createDocumentFragment();
            edgesToDraw.forEach(edge => {
                const s = nodeMap.get(edge.source);
                const t = nodeMap.get(edge.target);
                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                g.classList.add('edge-group');

                // Visible Line
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', s.x); line.setAttribute('y1', s.y);
                line.setAttribute('x2', t.x); line.setAttribute('y2', t.y);
                line.setAttribute('stroke', App.Config.EDGE_STROKE); 
                line.setAttribute('stroke-width', App.Config.EDGE_STROKE_WIDTH);
                line.classList.add('edge'); // CSS controls visibility
                g.appendChild(line);

                // Admin "Hit Box" Line (Invisible but clickable)
                if (isAdmin) {
                    const hitLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    hitLine.setAttribute('x1', s.x); line.setAttribute('y1', s.y);
                    hitLine.setAttribute('x2', t.x); line.setAttribute('y2', t.y);
                    hitLine.setAttribute('stroke', 'transparent'); 
                    hitLine.setAttribute('stroke-width', '15');
                    hitLine.style.cursor = 'copy'; // Cursor indicates "Split/Add Node"
                    
                    // Attach data so Admin script knows which edge this is
                    hitLine.classList.add('admin-edge-hitbox'); 
                    hitLine.dataset.edgeId = edge.id || '';
                    hitLine.dataset.edgeSource = edge.source;
                    hitLine.dataset.edgeTarget = edge.target;
                    
                    g.appendChild(hitLine);
                }
                edgeFragment.appendChild(g);
            });
            App.DOM.edgeContainer.appendChild(edgeFragment);

            // 2. DRAW NODES
            const nodeFragment = document.createDocumentFragment();
            nodesToDraw.forEach(node => {
                const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                group.setAttribute('id', `g-${node.id}`);
                
                // Classes for identification
                group.classList.add('node-group');
                if (node.type === 'hallway') group.classList.add('hallway-group'); 
                else group.classList.add('node-label-group');
                
                // Data attribute for Admin Event Delegation
                group.dataset.nodeId = node.id;

                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('id', node.id); 
                circle.setAttribute('cx', node.x); 
                circle.setAttribute('cy', node.y);
                
                let radius = (node.type === 'room') ? App.Config.ROOM_RADIUS : 
                             (node.type === 'hallway' ? App.Config.HALLWAY_RADIUS : App.Config.CONNECTOR_RADIUS);
                
                circle.setAttribute('r', radius);
                
                let nodeClass = `node ${node.type}`;
                
                // State Styling
                if (isAdmin) {
                    nodeClass += ' draggable';
                    // Highlight selected node in Connect/Disconnect modes
                    if (typeof App.AdminEditor !== 'undefined' && App.AdminEditor.editMode.firstNodeId === node.id) {
                        nodeClass += ' selected-for-action';
                    }
                } else {
                    if (node.type === 'room') nodeClass += ' path-selectable';
                    if (node.id === App.State.selectedStartId) nodeClass += ' start-node-selected';
                    else if (node.id === App.State.selectedEndId) nodeClass += ' end-node-selected';
                }

                if (node.type === 'elevator' && node.access === 'employee') nodeClass += ' elevator-employee';
                circle.setAttribute('class', nodeClass);
                group.appendChild(circle);

                // Labels for Rooms
               if (node.type === 'room') {
                    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    text.setAttribute('x', node.x); 
                    text.setAttribute('y', Number(node.y) + 20);
                    text.setAttribute('class', 'node-label'); 
                    text.textContent = node.name; 
                    group.appendChild(text);
                }
                
                // Interactions: ONLY Student Logic here. Admin logic moved to app-admin.js
                if (!isAdmin) {
                    group.addEventListener('click', (e) => {
                        e.stopPropagation();
                        App.Pathfinder.handleNodeSelection(node.id);
                    });
                }
                nodeFragment.appendChild(group);
            });
            App.DOM.nodeContainer.appendChild(nodeFragment);

            // 3. DRAW PERSISTENT PATH
            if (App.State.activePath) {
                App.Pathfinder.renderPersistentPath(floor);
            }
        },
        
        redrawMapElements: () => {
            if (!App.DOM.nodeContainer || !App.DOM.edgeContainer) return;
            App.DOM.nodeContainer.innerHTML = '';
            App.DOM.edgeContainer.innerHTML = '';
            App.Renderer.drawMapElements(App.State.currentFloor);
        },

        loadFloorVisuals: () => {
            App.DOM.mapSvg.innerHTML = '';
            const floor = App.State.currentFloor;
            
            // Create SVG Layers in order
            const imageEl = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            App.DOM.mapSvg.appendChild(imageEl);

            App.DOM.pathContainer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            App.DOM.pathContainer.setAttribute('id', 'path-container');
            App.DOM.mapSvg.appendChild(App.DOM.pathContainer);
            
            App.DOM.edgeContainer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            App.DOM.edgeContainer.setAttribute('id', 'edge-container');
            App.DOM.mapSvg.appendChild(App.DOM.edgeContainer);
            
            App.DOM.nodeContainer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            App.DOM.nodeContainer.setAttribute('id', 'node-container');
            App.DOM.mapSvg.appendChild(App.DOM.nodeContainer);

            // Create Bravo Marker (Hidden initially)
            const marker = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            marker.setAttribute('id', 'userMarker');
            marker.setAttribute('href', 'res/images/bravo_marker.png'); // IMPORTANT: Ensure file exists
            marker.setAttribute('width', '40');
            marker.setAttribute('height', '40');
            marker.setAttribute('class', 'marker-bounce');
            marker.style.display = 'none'; 
            App.DOM.mapSvg.appendChild(marker);
            
            // Load Background Image
            const dataUrl = (App.mapData.floorPlans && App.mapData.floorPlans[floor]) ? App.mapData.floorPlans[floor] : null;

            if (!dataUrl) {
                App.DOM.mapSvg.setAttribute('viewBox', App.Config.DEFAULT_VIEWBOX);
                App.Renderer.drawMapElements(floor);
                return;
            }

            const img = new Image();
            img.onload = () => {
                App.DOM.mapSvg.setAttribute('viewBox', `0 0 ${img.naturalWidth} ${img.naturalHeight}`);
                imageEl.setAttribute('href', img.src);
                imageEl.setAttribute('width', img.naturalWidth);
                imageEl.setAttribute('height', img.naturalHeight);
                App.Renderer.drawMapElements(floor);
            };
            img.onerror = () => {
                App.DOM.mapSvg.setAttribute('viewBox', App.Config.DEFAULT_VIEWBOX);
                App.Renderer.drawMapElements(floor);
            };
            img.src = dataUrl;
        }
    };
    
    // --- PATHFINDER ---
    App.Pathfinder = {
        getWeight: (sourceNode, targetNode) => {
            if (sourceNode.floor !== targetNode.floor) {
                if (sourceNode.type === 'stairs' && targetNode.type === 'stairs') return App.Config.STAIR_WEIGHT;
                if (sourceNode.type === 'elevator' && targetNode.type === 'elevator') return App.Config.ELEVATOR_WEIGHT;
                return Infinity;
            }
            if (sourceNode.type === 'stairs' || targetNode.type === 'stairs') return App.Config.STAIR_WEIGHT;
            if (sourceNode.type === 'elevator' || targetNode.type === 'elevator') return App.Config.ELEVATOR_WEIGHT;
            // Visual distance weight
            return Math.max(1, Math.round(Math.hypot(sourceNode.x - targetNode.x, sourceNode.y - targetNode.y) / 10));
        },

        findShortestPath: (startId, endId) => {
            const distances = {};
            const previous = {};
            const pq = new Map();
            const nodeMap = new Map(App.mapData.nodes.map(n => [n.id, n]));
            
            App.mapData.nodes.forEach(node => { 
                distances[node.id] = Infinity; 
                previous[node.id] = null; 
            });
            distances[startId] = 0; 
            pq.set(startId, 0);
            
            const isAccessible = App.RoleManager.isNodeAccessible;

            while (pq.size > 0) {
                let closestNodeId = null; 
                let minDistance = Infinity;
                for (const [nodeId, dist] of pq) { 
                    if (dist < minDistance) { minDistance = dist; closestNodeId = nodeId; } 
                }

                if (closestNodeId === endId || closestNodeId === null || distances[closestNodeId] === Infinity) break;
                pq.delete(closestNodeId);
                const closestNode = nodeMap.get(closestNodeId);

                if (!isAccessible(closestNode)) continue;
                
                const neighbors = App.adjacencyList.get(closestNodeId) || [];
                for (const neighborId of neighbors) {
                    const neighborNode = nodeMap.get(neighborId);
                    if (!neighborNode || !isAccessible(neighborNode)) continue;
                    
                    const newDist = distances[closestNodeId] + App.Pathfinder.getWeight(closestNode, neighborNode);
                    if (newDist < distances[neighborId]) {
                        distances[neighborId] = newDist;
                        previous[neighborId] = closestNodeId;
                        pq.set(neighborId, newDist);
                    }
                }
            }
            const path = []; 
            let currentNode = endId;
            while (currentNode) { path.unshift(currentNode); currentNode = previous[currentNode]; }
            return path[0] === startId ? path : null;
        },

        highlightStep: (fromId, toId) => {
            const fromNode = App.mapData.nodes.find(n => n.id === fromId);
            if (!fromNode) return;

            const showMarker = () => {
                const marker = document.getElementById('userMarker');
                if (marker) {
                    marker.setAttribute('x', fromNode.x - 20);
                    marker.setAttribute('y', fromNode.y - 40); 
                    marker.style.display = 'block';
                }
                
                document.querySelectorAll('.route-step').forEach(el => el.classList.remove('bg-brand-gold', 'text-brand-dark'));
                const stepEl = document.querySelector(`li[data-from-id="${fromId}"]`);
                if(stepEl) stepEl.classList.add('bg-brand-gold', 'text-brand-dark');
            };

            if (fromNode.floor !== App.State.currentFloor) {
                App.Renderer.switchFloor(fromNode.floor);
                setTimeout(showMarker, 350);
            } else {
                showMarker();
            }
        },

        handleFindPath: () => {
            App.Pathfinder.clearHighlights(false);
            const startId = App.State.selectedStartId;
            const endId = App.State.selectedEndId;
            
            if (!startId || !endId || startId === endId) { 
                App.DOM.pathInstructions.innerHTML = '<p class="text-brand-orange font-bold">Please select distinct start and end points.</p>'; 
                return; 
            }
            
            const path = App.Pathfinder.findShortestPath(startId, endId);
            
            if (path) {
                App.State.activePath = path; // SAVE PATH
                App.Pathfinder.animatePath(path, 0);
            } else {
                App.DOM.pathInstructions.innerHTML = '<p class="text-red-400 font-bold">No path found. Check role access.</p>'; 
            }
        },
        
        handleNodeSelection: (nodeId) => {
            const node = App.mapData.nodes.find(n => n.id === nodeId);
            if (!node || node.type !== 'room') return;

            App.Pathfinder.clearHighlights(false);

            if (!App.State.selectedStartId) App.State.selectedStartId = nodeId;
            else if (!App.State.selectedEndId) {
                if (nodeId === App.State.selectedStartId) App.State.selectedStartId = null;
                else App.State.selectedEndId = nodeId;
            } else {
                App.State.selectedStartId = nodeId;
                App.State.selectedEndId = null;
            }
            App.Renderer.updatePathUI();
            App.Renderer.redrawMapElements();
        },

        animatePath: (path, pathIndex) => {
            if (pathIndex === 0) {
                App.DOM.pathInstructions.innerHTML = '<ol id="instructionList" class="list-decimal list-inside space-y-1"></ol>'; 
                App.Pathfinder.buildInstructions(path);
            }
            
            if (pathIndex >= path.length) return;
            
            const startNode = App.mapData.nodes.find(n => n.id === path[pathIndex]);
            if (!startNode) return;
            
            App.Renderer.switchFloor(startNode.floor);
            
            setTimeout(() => {
                let nextFloorIndex = -1;
                for (let i = pathIndex; i < path.length; i++) {
                    const currentNode = App.mapData.nodes.find(n => n.id === path[i]);
                    if (currentNode.floor !== startNode.floor) {
                        nextFloorIndex = i;
                        break;
                    }
                }
                
                App.Pathfinder.renderPersistentPath(startNode.floor);

                if (nextFloorIndex !== -1) {
                    App.Pathfinder.animatePath(path, nextFloorIndex); 
                }
            }, 300);
        },

        renderPersistentPath: (floor) => {
            const path = App.State.activePath;
            if (!path || path.length < 2) return;

            let currentSegment = [];
            
            for (let i = 0; i < path.length; i++) {
                const node = App.mapData.nodes.find(n => n.id === path[i]);
                if (!node) continue;

                if (node.floor === floor) {
                    currentSegment.push(node);
                } else {
                    if (currentSegment.length > 1) {
                        App.Pathfinder.drawPolyline(currentSegment);
                    }
                    currentSegment = [];
                }
            }
            if (currentSegment.length > 1) {
                App.Pathfinder.drawPolyline(currentSegment);
            }

            path.forEach(id => {
                const n = App.mapData.nodes.find(x => x.id === id);
                if (n && n.floor === floor) {
                    const el = document.getElementById(n.id);
                    if (el) el.classList.add('highlight');
                }
            });
        },

        drawPolyline: (nodes) => {
            const points = nodes.map(n => `${n.x},${n.y}`).join(' ');
            const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            polyline.setAttribute('points', points);
            polyline.setAttribute('class', 'path');
            App.DOM.pathContainer.appendChild(polyline);
        },

        buildInstructions: (path) => {
            const list = document.getElementById('instructionList');
            const fragment = document.createDocumentFragment();
            
            for(let i = 0; i < path.length - 1; i++){
                const stepFrom = App.mapData.nodes.find(n => n.id === path[i]);
                const stepTo = App.mapData.nodes.find(n => n.id === path[i+1]);
                
                if (stepFrom.type === 'hallway' && stepTo.type === 'hallway') continue;
                
                const li = document.createElement('li');
                li.innerHTML = `Go from <strong class="text-brand-gold">${stepFrom.name}</strong> to <strong class="text-brand-gold">${stepTo.name}</strong>`;
                li.dataset.fromId = stepFrom.id;
                li.dataset.toId = stepTo.id;
                li.classList.add('route-step'); 
                li.addEventListener('click', () => App.Pathfinder.highlightStep(stepFrom.id, stepTo.id));
                fragment.appendChild(li);
            }
            list.appendChild(fragment);
        },
        
        clearHighlights: (clearSelections = true) => {
            document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
            document.querySelectorAll('.step-highlight').forEach(el => el.classList.remove('step-highlight'));
            
            if (App.DOM.pathContainer) App.DOM.pathContainer.innerHTML = '';
            
            const marker = document.getElementById('userMarker');
            if (marker) marker.style.display = 'none';

            if (clearSelections) {
                App.State.selectedStartId = null;
                App.State.selectedEndId = null;
                App.State.activePath = null;
                App.Renderer.updatePathUI();
            }
            App.Renderer.redrawMapElements();
        }
    };

    App.init = async () => {
        // Legend Toggle Logic
        if (App.DOM.mapLegendHeader) {
            App.DOM.mapLegendHeader.addEventListener('click', (e) => {
                e.stopPropagation();
                App.DOM.mapLegend.classList.toggle('collapsed');
            });
        }

        try {
            const response = await fetch('http://localhost:3000/api/admin/check-session', { credentials: 'include' });
            const data = await response.json();
            App.State.isAdminLoggedIn = data.isAdmin;
        } catch (err) {
            App.State.isAdminLoggedIn = false;
        }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.textContent = App.State.isAdminLoggedIn ? "Home" : "Home";
            logoutBtn.addEventListener('click', async () => {
                if (App.State.isAdminLoggedIn) {
                    await fetch('http://localhost:3000/api/logout', { method: 'POST', credentials: 'include' });
                }
                window.location.href = 'index.html';
            });
        }

        App.DOM.findPathBtn.addEventListener('click', App.Pathfinder.handleFindPath);
        App.DOM.modalCancelBtn.addEventListener('click', App.Modal.hide);
        App.DOM.modalConfirmBtn.addEventListener('click', () => { if (App.State.modalConfirmCallback) App.State.modalConfirmCallback(); });

        // NOTE: No click listeners attached here for Admin functions.
        // Admin listeners are handled in app-admin.js via delegation.

        App.Utils.buildGraphMap();
        App.Renderer.populateSelectors();
        App.Renderer.createRoleButtons();
        App.Renderer.updateFloorButtons();
        App.Renderer.switchFloor(1);
        
        App.RoleManager.setRole(App.State.isAdminLoggedIn ? 'admin' : 'student');
        App.Renderer.updatePathUI();
    };
    
    App.init();
}

document.addEventListener('DOMContentLoaded', () => {
   fetch('server-user/getData.php')
        .then(response => response.ok ? response.json() : Promise.reject(response.status))
        .then(data => {
            App.mapData = data;
            initializeApp();
        })
        .catch(error => {
            console.error("Error loading map data:", error);
            const mapSvg = document.getElementById('mapSvg');
            if (mapSvg) mapSvg.innerHTML = `<text x="400" y="250" text-anchor="middle" fill="#F26419" font-size="20">Error loading map data.</text>`;
        });
});
window.App = {
    mapData: { nodes: [], edges: [] }
};

function initializeApp() {
    App.DOM = {
        findPathBtn: document.getElementById('findPathBtn'),
        mapSvg: document.getElementById('mapSvg'),
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

    App.State = {
        currentFloor: 1,
        currentRole: 'student',
        modalConfirmCallback: null,
        selectedStartId: null,
        selectedEndId: null
    };

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

    App.RoleManager = {
        roles: {
            'student': { label: 'Student', isNodeAccessible: (node) => node.access !== 'employee' },
            'pwd-student': { label: 'PWD Student', isNodeAccessible: (node) => node.type !== 'stairs' && node.access !== 'employee' },
            'employee': { label: 'Employee', isNodeAccessible: (node) => true },
            'admin': { label: 'Admin', isNodeAccessible: (node) => true }
        },

        setRole: (newRole) => {
            if (!App.RoleManager.roles[newRole]) return;
            
            App.State.currentRole = newRole;
            const isAdmin = (newRole === 'admin');
            
            const mainContentWrapper = document.getElementById('mainContentWrapper');
            if (isAdmin) {
                mainContentWrapper.classList.remove('justify-center');
            } else {
                mainContentWrapper.classList.add('justify-center');
            }

            App.DOM.adminPanel.classList.toggle('hidden', !isAdmin);

            document.querySelectorAll('.role-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.role === newRole);
            });

            if (isAdmin && typeof App.AdminEditor !== 'undefined') {
                App.AdminEditor.init();
            } else if (typeof App.AdminEditor !== 'undefined') {
                App.AdminEditor.shutdown();
            }
            
            App.Pathfinder.clearHighlights();
            App.Renderer.redrawMapElements();
        },

        isNodeAccessible: (node) => {
            const strategy = App.RoleManager.roles[App.State.currentRole];
            if (!strategy) return false;
            return strategy.isNodeAccessible(node);
        }
    };

    App.Renderer = {
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

        switchFloor: (floorNum) => {
            if (!App.mapData.nodes.some(n => n.floor === floorNum)) {
                 const floors = [...new Set(App.mapData.nodes.map(n => n.floor))].sort((a,b) => a-b);
                 floorNum = floors.length > 0 ? floors[0] : 1;
            }
            App.State.currentFloor = floorNum;
            App.DOM.mapContainer.style.opacity = '0';
            setTimeout(() => {
                App.Renderer.loadFloorVisuals();
                App.Renderer.updateFloorButtons();
                App.DOM.mapContainer.style.opacity = '1';
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

            App.DOM.selectedStartDisplay.textContent = startNode ? `${startNode.name} (${getFloorLabel(startNode.floor)})` : 'None';
            App.DOM.selectedEndDisplay.textContent = endNode ? `${endNode.name} (${getFloorLabel(endNode.floor)})` : 'None';
            
            if (!startNode) {
                App.DOM.pathInstructions.innerHTML = '<p class="text-gray-500">Click a room on the map to select a start point.</p>';
            } else if (!endNode) {
                App.DOM.pathInstructions.innerHTML = '<p class="text-gray-500">Click a room on the map to select a destination.</p>';
            }
        },
 
        drawMapElements: (floor) => {
            const isAdmin = App.State.currentRole === 'admin';
            const nodesToDraw = App.mapData.nodes.filter(n => n.floor === floor);
            const edgesToDraw = App.mapData.edges.filter(edge => {
                const sourceNode = App.mapData.nodes.find(n => n.id === edge.source);
                const targetNode = App.mapData.nodes.find(n => n.id === edge.target);
                return sourceNode && targetNode && sourceNode.floor === floor && targetNode.floor === floor;
            });

            edgesToDraw.forEach(edge => {
                const sourceNode = App.mapData.nodes.find(n => n.id === edge.source);
                const targetNode = App.mapData.nodes.find(n => n.id === edge.target);
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', sourceNode.x); line.setAttribute('y1', sourceNode.y);
                line.setAttribute('x2', targetNode.x); line.setAttribute('y2', targetNode.y);
                line.setAttribute('stroke', '#4A5568'); line.setAttribute('stroke-width', 2);
                line.classList.add('edge');
                App.DOM.mapSvg.appendChild(line);
            });

            nodesToDraw.forEach(node => {
                const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                group.setAttribute('id', `g-${node.id}`);
                group.classList.add('node-label-group');
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('id', node.id); circle.setAttribute('cx', node.x); circle.setAttribute('cy', node.y);
                circle.setAttribute('r', node.type === 'room' ? 7 : (node.type === 'hallway' ? 5 : 10));
                
                let nodeClass = `node ${node.type}`;
                
                if (isAdmin) {
                    nodeClass += ' draggable';
                    if (typeof App.AdminEditor !== 'undefined' && App.AdminEditor.editMode.firstNodeId === node.id) {
                        nodeClass += ' selected-for-action';
                    }
                } else {
                    if (node.type === 'room') {
                        nodeClass += ' path-selectable';
                    }
                    if (node.id === App.State.selectedStartId) {
                        nodeClass += ' start-node-selected';
                    } else if (node.id === App.State.selectedEndId) {
                        nodeClass += ' end-node-selected';
                    }
                }

                if (node.type === 'elevator' && node.access === 'employee') nodeClass += ' elevator-employee';
                circle.setAttribute('class', nodeClass);
                group.appendChild(circle);

                if (node.type === 'room') {
                    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    text.setAttribute('x', node.x); 
                    text.setAttribute('y', node.y + 20);
                    text.setAttribute('text-anchor', 'middle');
                    text.setAttribute('class', 'node-label');
                    text.classList.add(node.type);
                    text.setAttribute('font-size', '8'); 
                    text.style.pointerEvents = 'none';
                    text.setAttribute('fill', 'black');
                    text.textContent = node.name;
                    group.appendChild(text);
                }
                
                if(isAdmin && typeof App.AdminEditor !== 'undefined') {
                    group.addEventListener('mousedown', (e) => { 
                        e.stopPropagation(); 
                        if (App.AdminEditor.editMode.mode) {
                            App.AdminEditor.handleMapClick(e);
                        } else {
                            App.AdminEditor.startDrag(e, node.id); 
                        }
                    });
                } else if (!isAdmin) {
                    group.addEventListener('click', (e) => {
                        e.stopPropagation();
                        App.Pathfinder.handleNodeSelection(node.id);
                    });
                }
                App.DOM.mapSvg.appendChild(group);
            });
        },
        
        redrawMapElements: () => {
            App.DOM.mapSvg.querySelectorAll('.node-label-group, .edge').forEach(el => el.remove());
            App.Renderer.drawMapElements(App.State.currentFloor);
        },

        loadFloorVisuals: () => {
            App.DOM.mapSvg.innerHTML = '';
            const floor = App.State.currentFloor;
            const defaultViewBox = '0 0 800 500';
            
            if (!App.mapData.nodes.some(n => n.floor === floor)) {
                 App.DOM.mapSvg.setAttribute('viewBox', defaultViewBox);
                 App.DOM.mapSvg.innerHTML = '<text x="400" y="250" text-anchor="middle" fill="white" font-size="20">No floors exist. Add a floor in admin panel.</text>';
                 return;
            }

            const extensionsToTry = ['png', 'svg', 'jpg', 'jpeg'];
            
            let tryNextExtension = (index) => {
                if (index >= extensionsToTry.length) {
                    App.DOM.mapSvg.setAttribute('viewBox', defaultViewBox);
                    App.Renderer.drawMapElements(floor);
                    return;
                }

                const ext = extensionsToTry[index];
                const img = new Image();
                img.src = `/res/images/floor-${floor}.${ext}`;

                img.onload = () => {
                    const vb = `0 0 ${img.naturalWidth} ${img.naturalHeight}`;
                    App.DOM.mapSvg.setAttribute('viewBox', vb);
                    
                    const imageEl = document.createElementNS('http://www.w3.org/2000/svg', 'image');
                    imageEl.setAttribute('href', img.src);
                    imageEl.setAttribute('x', '0');
                    imageEl.setAttribute('y', '0');
                    imageEl.setAttribute('width', img.naturalWidth);
                    imageEl.setAttribute('height', img.naturalHeight);
                    App.DOM.mapSvg.appendChild(imageEl);
                    
                    App.Renderer.drawMapElements(floor);
                };
                
                img.onerror = () => {
                    tryNextExtension(index + 1);
                };
            };
            
            tryNextExtension(0);
        }
    };
    
    App.Pathfinder = {
        getWeight: (sourceNode, targetNode) => {
             if (sourceNode.floor !== targetNode.floor) {
                 if (sourceNode.type === 'stairs' && targetNode.type === 'stairs') return 15;
                 if (sourceNode.type === 'elevator' && targetNode.type === 'elevator') return 5;
                 return Infinity;
             }
             return Math.round(Math.hypot(sourceNode.x - targetNode.x, sourceNode.y - targetNode.y) / 10) || 1;
        },

        findShortestPath: (startId, endId) => {
            const distances = {}; const previous = {}; const pq = new Map();
            App.mapData.nodes.forEach(node => { distances[node.id] = Infinity; previous[node.id] = null; pq.set(node.id, Infinity); });
            distances[startId] = 0; pq.set(startId, 0);
            
            const isNodeAccessible = App.RoleManager.isNodeAccessible;

            while (pq.size > 0) {
                let closestNodeId = null; let minDistance = Infinity;
                for (const [nodeId, dist] of pq.entries()) { if (dist < minDistance) { minDistance = dist; closestNodeId = nodeId; } }
                if (closestNodeId === endId || closestNodeId === null || distances[closestNodeId] === Infinity) break;
                
                const closestNode = App.mapData.nodes.find(n => n.id === closestNodeId);
                pq.delete(closestNodeId);

                if (!isNodeAccessible(closestNode)) continue;
                
                const neighbors = App.mapData.edges.filter(edge => edge.source === closestNodeId || edge.target === closestNodeId);
                for (const edge of neighbors) {
                    const neighborId = edge.source === closestNodeId ? edge.target : edge.source;
                    const neighborNode = App.mapData.nodes.find(n => n.id === neighborId);
                    if (!neighborNode || !isNodeAccessible(neighborNode)) continue;
                    
                    const newDist = distances[closestNodeId] + App.Pathfinder.getWeight(closestNode, neighborNode);
                    
                    if (newDist < distances[neighborId]) {
                        distances[neighborId] = newDist;
                        previous[neighborId] = closestNodeId;
                        if (pq.has(neighborId)) { pq.set(neighborId, newDist); }
                    }
                }
            }
            const path = []; let currentNode = endId;
            while (currentNode) { path.unshift(currentNode); currentNode = previous[currentNode]; }
            return path[0] === startId ? path : null;
        },

        handleFindPath: () => {
            App.Pathfinder.clearHighlights(false);
            const startId = App.State.selectedStartId;
            const endId = App.State.selectedEndId;
            
            if (!startId || !endId) { App.DOM.pathInstructions.innerHTML = '<p class="text-yellow-400">Please select start and end locations from the map.</p>'; return; }
            if (startId === endId) { App.DOM.pathInstructions.innerHTML = '<p class="text-yellow-400">Start and end cannot be the same.</p>'; return; }
            
            const path = App.Pathfinder.findShortestPath(startId, endId);
            
            if (path) { App.Pathfinder.animatePath(path, 0); } 
            else { App.DOM.pathInstructions.innerHTML = '<p class="text-red-400">No path found. The route may be restricted.</p>'; }
        },
        
        handleNodeSelection: (nodeId) => {
            const node = App.mapData.nodes.find(n => n.id === nodeId);
            if (!node || node.type !== 'room') return;

            App.Pathfinder.clearHighlights(false);

            if (!App.State.selectedStartId) {
                App.State.selectedStartId = nodeId;
            } else if (!App.State.selectedEndId) {
                if (nodeId === App.State.selectedStartId) {
                    App.State.selectedStartId = null;
                } else {
                    App.State.selectedEndId = nodeId;
                }
            } else {
                App.State.selectedStartId = nodeId;
                App.State.selectedEndId = null;
            }

            App.Renderer.updatePathUI();
            App.Renderer.redrawMapElements();
        },

        animatePath: (path, pathIndex) => {
            if (pathIndex === 0) { App.DOM.pathInstructions.innerHTML = '<ol id="instructionList" class="list-decimal list-inside"></ol>'; }
            if (pathIndex >= path.length) return;
            const startNode = App.mapData.nodes.find(n => n.id === path[pathIndex]);
            if (!startNode) return;
            
            App.Renderer.switchFloor(startNode.floor);
            
            setTimeout(() => {
                let segment = []; let nextFloor = -1;
                for (let i = pathIndex; i < path.length; i++) {
                    const currentNode = App.mapData.nodes.find(n => n.id === path[i]);
                    if (currentNode.floor === startNode.floor) { segment.push(path[i]); } 
                    else { nextFloor = currentNode.floor; break; }
                }
                App.Pathfinder.drawSegment(segment);
                if (nextFloor !== -1) { App.Pathfinder.animatePath(path, pathIndex + segment.length); }
            }, 500);
        },

        drawSegment: (segment) => {
            if (segment.length === 0) return;
            const instructionList = document.getElementById('instructionList');
            if (segment.length > 1) {
                const points = segment.map(nodeId => { const node = App.mapData.nodes.find(n => n.id === nodeId); return `${node.x},${node.y}`; }).join(' ');
                const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
                polyline.setAttribute('points', points);
                polyline.setAttribute('class', 'path');
                
                App.DOM.mapSvg.appendChild(polyline);
            }
            segment.forEach(nodeId => { 
                if (nodeId === App.State.selectedStartId || nodeId === App.State.selectedEndId) return;
                const nodeEl = document.getElementById(nodeId); 
                if (nodeEl) nodeEl.classList.add('highlight'); 
            });
            for(let i = 0; i < segment.length - 1; i++){
                const stepFrom = App.mapData.nodes.find(n => n.id === segment[i]);
                const stepTo = App.mapData.nodes.find(n => n.id === segment[i+1]);
                if (stepFrom.type === 'hallway' && stepTo.type === 'hallway') continue;
                const li = document.createElement('li');
                li.innerHTML = `Go from <strong>${stepFrom.name}</strong> to <strong>${stepTo.name}</strong>`;
                instructionList.appendChild(li);
            }
        },
        
        clearHighlights: (clearSelections = true) => {
            document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
            document.querySelectorAll('.path').forEach(el => el.remove());
            App.DOM.pathInstructions.innerHTML = '<p class="text-gray-500">Select a start and end point to see the route.</p>';

            if (clearSelections) {
                App.State.selectedStartId = null;
                App.State.selectedEndId = null;
                App.Renderer.updatePathUI();
            }
            App.Renderer.redrawMapElements();
        }
    };

    App.init = () => {
        App.DOM.findPathBtn.addEventListener('click', App.Pathfinder.handleFindPath);
        App.DOM.modalCancelBtn.addEventListener('click', App.Modal.hide);
        App.DOM.modalConfirmBtn.addEventListener('click', () => {
            if (App.State.modalConfirmCallback) App.State.modalConfirmCallback();
        });

        if (App.DOM.mapLegendHeader) {
            App.DOM.mapLegendHeader.addEventListener('click', () => {
                const legend = document.getElementById('mapLegend');
                if (legend) {
                    legend.classList.toggle('collapsed');
                }
            });
        }

        App.DOM.mapSvg.addEventListener('click', (e) => {
            if (App.State.currentRole === 'admin' && typeof App.AdminEditor !== 'undefined') {
                if (App.AdminEditor.isDragging) return;
                
                if (e.target.tagName.toLowerCase() === 'svg' || e.target.tagName.toLowerCase() === 'image') {
                     App.AdminEditor.handleMapClick(e);
                }
            }
        });
        
        App.Renderer.populateSelectors();
        App.Renderer.createRoleButtons();
        App.Renderer.updateFloorButtons();
        App.Renderer.switchFloor(1);
        App.RoleManager.setRole(App.State.currentRole);
        App.Renderer.updatePathUI();
    };
    
    App.init();
}

document.addEventListener('DOMContentLoaded', () => {
    fetch('../api/getData.php') 
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            App.mapData = data;
            initializeApp();
        })
        .catch(error => {
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
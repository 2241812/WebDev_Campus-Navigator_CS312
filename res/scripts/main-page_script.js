
        document.addEventListener('DOMContentLoaded', () => {
            // --- DATA ---
            let mapData = {
                "nodes": [
                    { "id": "D-101", "name": "Room 101", "type": "room", "floor": 1, "x": 100, "y": 100 }, { "id": "D-105", "name": "Room 105", "type": "room", "floor": 1, "x": 100, "y": 400 }, { "id": "D-115", "name": "Room 115", "type": "room", "floor": 1, "x": 700, "y": 250 }, { "id": "H-1-1", "name": "Hallway", "type": "hallway", "floor": 1, "x": 200, "y": 100 }, { "id": "H-1-2", "name": "Hallway", "type": "hallway", "floor": 1, "x": 200, "y": 400 }, { "id": "H-1-3", "name": "Hallway", "type": "hallway", "floor": 1, "x": 450, "y": 100 }, { "id": "H-1-4", "name": "Hallway", "type": "hallway", "floor": 1, "x": 450, "y": 400 }, { "id": "H-1-5", "name": "Hallway", "type": "hallway", "floor": 1, "x": 600, "y": 250 }, { "id": "S-1-W2", "name": "Stairs", "type": "stairs", "floor": 1, "x": 450, "y": 50 }, { "id": "E-1-C", "name": "Elevator (Emp)", "type": "elevator", "floor": 1, "x": 450, "y": 450, "access": "employee" }, { "id": "E-1-Pub", "name": "Elevator", "type": "elevator", "floor": 1, "x": 200, "y": 250, "access": "all" },
                    { "id": "D-210", "name": "Room 210", "type": "room", "floor": 2, "x": 700, "y": 100 }, { "id": "D-220", "name": "Room 220", "type": "room", "floor": 2, "x": 700, "y": 400 }, { "id": "H-2-1", "name": "Hallway", "type": "hallway", "floor": 2, "x": 200, "y": 100 }, { "id": "H-2-2", "name": "Hallway", "type": "hallway", "floor": 2, "x": 200, "y": 400 }, { "id": "H-2-3", "name": "Hallway", "type": "hallway", "floor": 2, "x": 450, "y": 100 }, { "id": "H-2-4", "name": "Hallway", "type": "hallway", "floor": 2, "x": 450, "y": 400 }, { "id": "H-2-5", "name": "Hallway", "type": "hallway", "floor": 2, "x": 600, "y": 100 }, { "id": "H-2-6", "name": "Hallway", "type": "hallway", "floor": 2, "x": 600, "y": 400 }, { "id": "S-2-W2", "name": "Stairs", "type": "stairs", "floor": 2, "x": 450, "y": 50 }, { "id": "E-2-C", "name": "Elevator (Emp)", "type": "elevator", "floor": 2, "x": 450, "y": 450, "access": "employee" }, { "id": "E-2-Pub", "name": "Elevator", "type": "elevator", "floor": 2, "x": 200, "y": 250, "access": "all" },
                    { "id": "D-301", "name": "Library", "type": "room", "floor": 3, "x": 150, "y": 250 }, { "id": "D-302", "name": "Computer Lab", "type": "room", "floor": 3, "x": 650, "y": 250 }, { "id": "H-3-1", "name": "Hallway", "type": "hallway", "floor": 3, "x": 300, "y": 250 }, { "id": "H-3-2", "name": "Hallway", "type": "hallway", "floor": 3, "x": 500, "y": 250 }, { "id": "H-3-3", "name": "Hallway", "type": "hallway", "floor": 3, "x": 400, "y": 100 }, { "id": "H-3-4", "name": "Hallway", "type": "hallway", "floor": 3, "x": 400, "y": 400 }, { "id": "S-3-W2", "name": "Stairs", "type": "stairs", "floor": 3, "x": 400, "y": 50 }, { "id": "E-3-C", "name": "Elevator (Emp)", "type": "elevator", "floor": 3, "x": 400, "y": 450, "access": "employee" }, { "id": "E-3-Pub", "name": "Elevator", "type": "elevator", "floor": 3, "x": 200, "y": 250, "access": "all" }
                ],
                "edges": [
                    { "source": "D-101", "target": "H-1-1" }, { "source": "D-105", "target": "H-1-2" }, { "source": "D-115", "target": "H-1-5" }, { "source": "H-1-1", "target": "H-1-2" }, { "source": "H-1-1", "target": "H-1-3" }, { "source": "H-1-2", "target": "H-1-4" }, { "source": "H-1-3", "target": "H-1-5" }, { "source": "H-1-4", "target": "H-1-5" }, { "source": "S-1-W2", "target": "H-1-3" }, { "source": "E-1-C", "target": "H-1-4" }, { "source": "H-1-1", "target": "E-1-Pub" }, { "source": "H-1-2", "target": "E-1-Pub" },
                    { "source": "D-210", "target": "H-2-5" }, { "source": "D-220", "target": "H-2-6" }, { "source": "H-2-1", "target": "H-2-2" }, { "source": "H-2-1", "target": "H-2-3" }, { "source": "H-2-2", "target": "H-2-4" }, { "source": "H-2-3", "target": "H-2-5" }, { "source": "H-2-4", "target": "H-2-6" }, { "source": "H-2-5", "target": "H-2-6" }, { "source": "S-2-W2", "target": "H-2-3" }, { "source": "E-2-C", "target": "H-2-4" }, { "source": "H-2-1", "target": "E-2-Pub" }, { "source": "H-2-2", "target": "E-2-Pub" },
                    { "source": "D-301", "target": "H-3-1" }, { "source": "D-302", "target": "H-3-2" }, { "source": "H-3-1", "target": "H-3-3" }, { "source": "H-3-1", "target": "H-3-4" }, { "source": "H-3-2", "target": "H-3-3" }, { "source": "H-3-2", "target": "H-3-4" }, { "source": "S-3-W2", "target": "H-3-3" }, { "source": "E-3-C", "target": "H-3-4" }, { "source": "E-3-Pub", "target": "H-3-1" },
                    { "source": "S-1-W2", "target": "S-2-W2" }, { "source": "E-1-C", "target": "E-2-C" }, { "source": "E-1-Pub", "target": "E-2-Pub" },
                    { "source": "S-2-W2", "target": "S-3-W2" }, { "source": "E-2-C", "target": "E-3-C" }, { "source": "E-2-Pub", "target": "E-3-Pub" }
                ],
                "floorPlans": {}
            };
            
            // --- STATE MANAGEMENT ---
            let currentFloor = 1; let isAdmin = false; let editMode = { mode: null, firstNodeId: null };
            let isDragging = false; let offset = { x: 0, y: 0 };
            let modalConfirmCallback = null;

            // --- DOM ELEMENTS ---
            const startNodeSelect = document.getElementById('startNode');
            const endNodeSelect = document.getElementById('endNode');
            const userRoleSelect = document.getElementById('userRole');
            const findPathBtn = document.getElementById('findPathBtn');
            const mapSvg = document.getElementById('mapSvg');
            const mapContainer = document.getElementById('mapContainer');
            const pathInstructions = document.getElementById('pathInstructions');
            const adminPanel = document.getElementById('adminPanel');
            const adminStatus = document.getElementById('adminStatus');
            const floorSelector = document.getElementById('floorSelector');
            const addFloorBtn = document.getElementById('addFloorBtn');
            const floorImageInput = document.getElementById('floorImageInput');
            const clearFloorImageBtn = document.getElementById('clearFloorImageBtn');
            const deleteFloorBtn = document.getElementById('deleteFloorBtn');
            const modal = document.getElementById('confirmationModal');
            const modalTitle = document.getElementById('modalTitle');
            const modalMessage = document.getElementById('modalMessage');
            const modalCancelBtn = document.getElementById('modalCancelBtn');
            const modalConfirmBtn = document.getElementById('modalConfirmBtn');
            const importMapInput = document.getElementById('importMapInput');
            const exportMapBtn = document.getElementById('exportMapBtn');

            // --- CORE LOGIC ---
            function getWeight(sourceNode, targetNode) {
                 if (sourceNode.floor !== targetNode.floor) {
                     // Vertical travel
                     if (sourceNode.type === 'stairs' && targetNode.type === 'stairs') return 15;
                     if (sourceNode.type === 'elevator' && targetNode.type === 'elevator') return 5;
                     return Infinity; // Should not happen with proper connections
                 }
                 // Horizontal travel (distance-based)
                 return Math.round(Math.hypot(sourceNode.x - targetNode.x, sourceNode.y - targetNode.y) / 10) || 1;
            }

            function findShortestPath(startId, endId, role) {
                const distances = {}; const previous = {}; const pq = new Map();
                mapData.nodes.forEach(node => { distances[node.id] = Infinity; previous[node.id] = null; pq.set(node.id, Infinity); });
                distances[startId] = 0; pq.set(startId, 0);
                
                const isNodeAccessible = (node) => {
                    if (role === 'pwd-student' && node.type === 'stairs') return false;
                    if (role !== 'admin' && role !== 'employee' && node.access === 'employee') return false;
                    return true;
                };

                while (pq.size > 0) {
                    let closestNodeId = null; let minDistance = Infinity;
                    for (const [nodeId, dist] of pq.entries()) { if (dist < minDistance) { minDistance = dist; closestNodeId = nodeId; } }
                    if (closestNodeId === endId || closestNodeId === null || distances[closestNodeId] === Infinity) break;
                    
                    const closestNode = mapData.nodes.find(n => n.id === closestNodeId);
                    pq.delete(closestNodeId);

                    if (!isNodeAccessible(closestNode)) continue;
                    
                    const neighbors = mapData.edges.filter(edge => edge.source === closestNodeId || edge.target === closestNodeId);
                    for (const edge of neighbors) {
                        const neighborId = edge.source === closestNodeId ? edge.target : edge.source;
                        const neighborNode = mapData.nodes.find(n => n.id === neighborId);
                        if (!neighborNode || !isNodeAccessible(neighborNode)) continue;
                        
                        const newDist = distances[closestNodeId] + getWeight(closestNode, neighborNode);
                        
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
            }

            // --- UI & SVG RENDERING ---
            function updateFloorButtons() {
                floorSelector.innerHTML = '';
                const floors = [...new Set(mapData.nodes.map(n => n.floor))].sort((a,b) => a-b);
                floors.forEach(floorNum => {
                    const button = document.createElement('button');
                    button.textContent = `Floor ${floorNum}`;
                    button.className = `px-4 py-2 rounded-md text-sm font-medium transition ${currentFloor === floorNum ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`;
                    button.onclick = () => switchFloor(floorNum);
                    floorSelector.appendChild(button);
                });
            }

            function switchFloor(floorNum) {
                if (!mapData.nodes.some(n => n.floor === floorNum)) {
                     const floors = [...new Set(mapData.nodes.map(n => n.floor))].sort((a,b) => a-b);
                     floorNum = floors.length > 0 ? floors[0] : 1;
                }

                if (currentFloor === floorNum && mapSvg.innerHTML !== '' && !isAdmin) return;
                currentFloor = floorNum;
                mapContainer.style.opacity = '0';
                setTimeout(() => {
                    drawCurrentFloor();
                    updateFloorButtons();
                    mapContainer.style.opacity = '1';
                }, 300);
            }
            
            function populateSelectors() {
                const startVal = startNodeSelect.value;
                const endVal = endNodeSelect.value;
                startNodeSelect.innerHTML = ''; endNodeSelect.innerHTML = '';
                const rooms = mapData.nodes.filter(node => node.type === 'room').sort((a, b) => a.id.localeCompare(b.id));
                rooms.forEach(room => {
                    const option1 = new Option(`${room.name} (F${room.floor})`, room.id);
                    const option2 = new Option(`${room.name} (F${room.floor})`, room.id);
                    startNodeSelect.add(option1); endNodeSelect.add(option2);
                });
                startNodeSelect.value = startVal;
                endNodeSelect.value = endVal;
                if (!endNodeSelect.value && endNodeSelect.options.length > 1) endNodeSelect.selectedIndex = 1;
                 if (startNodeSelect.options.length === 0) {
                    startNodeSelect.add(new Option('No rooms available', ''));
                    endNodeSelect.add(new Option('No rooms available', ''));
                }
            }

            function drawCurrentFloor() {
                mapSvg.innerHTML = '';
                 if (!mapData.nodes.some(n => n.floor === currentFloor)) {
                     mapSvg.innerHTML = '<text x="400" y="250" text-anchor="middle" fill="white" font-size="20">No floors exist. Add a floor in admin panel.</text>';
                     return;
                 }

                if (mapData.floorPlans && mapData.floorPlans[currentFloor]) {
                    const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
                    image.setAttribute('href', mapData.floorPlans[currentFloor]);
                    image.setAttribute('x', '0'); image.setAttribute('y', '0');
                    image.setAttribute('width', '800'); image.setAttribute('height', '500');
                    mapSvg.appendChild(image);
                }
                const nodesToDraw = mapData.nodes.filter(n => n.floor === currentFloor);
                const edgesToDraw = mapData.edges.filter(edge => {
                    const sourceNode = mapData.nodes.find(n => n.id === edge.source);
                    const targetNode = mapData.nodes.find(n => n.id === edge.target);
                    return sourceNode && targetNode && sourceNode.floor === currentFloor && targetNode.floor === currentFloor;
                });
                edgesToDraw.forEach(edge => {
                    const sourceNode = mapData.nodes.find(n => n.id === edge.source);
                    const targetNode = mapData.nodes.find(n => n.id === edge.target);
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', sourceNode.x); line.setAttribute('y1', sourceNode.y);
                    line.setAttribute('x2', targetNode.x); line.setAttribute('y2', targetNode.y);
                    line.setAttribute('stroke', '#4A5568'); line.setAttribute('stroke-width', 2);
                    mapSvg.appendChild(line);
                });
                nodesToDraw.forEach(node => {
                    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                    group.setAttribute('id', `g-${node.id}`);
                    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    circle.setAttribute('id', node.id); circle.setAttribute('cx', node.x); circle.setAttribute('cy', node.y);
                    circle.setAttribute('r', node.type === 'room' ? 15 : (node.type === 'hallway' ? 5 : 10));
                    
                    let nodeClass = `node ${node.type} ${isAdmin ? 'draggable' : ''}`;
                    if (node.type === 'elevator' && node.access === 'employee') nodeClass += ' elevator-employee';
                    if (editMode.firstNodeId === node.id) nodeClass += ' selected-for-action';
                    circle.setAttribute('class', nodeClass);
                    group.appendChild(circle);
                    if (node.type !== 'hallway') {
                        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                        text.setAttribute('x', node.x); text.setAttribute('y', node.y + (node.type === 'room' ? 30 : 25));
                        text.setAttribute('text-anchor', 'middle'); text.setAttribute('fill', 'white');
                        text.setAttribute('font-size', '12'); text.style.pointerEvents = 'none';
                        text.textContent = node.name;
                        group.appendChild(text);
                    }
                    if(isAdmin) group.addEventListener('mousedown', (e) => { e.stopPropagation(); startDrag(e, node.id); });
                    mapSvg.appendChild(group);
                });
            }

            function handleFindPath() {
                clearHighlights();
                const startId = startNodeSelect.value; const endId = endNodeSelect.value; const role = userRoleSelect.value;
                if (!startId || !endId) { pathInstructions.innerHTML = '<p class="text-yellow-400">Please select start and end locations.</p>'; return; }
                if (startId === endId) { pathInstructions.innerHTML = '<p class="text-yellow-400">Start and end cannot be the same.</p>'; return; }
                const path = findShortestPath(startId, endId, role);
                if (path) { animatePath(path, 0); } 
                else { pathInstructions.innerHTML = '<p class="text-red-400">No path found. The route may be restricted.</p>'; }
            }
            
            function animatePath(path, pathIndex) {
                if (pathIndex === 0) { pathInstructions.innerHTML = '<ol id="instructionList" class="list-decimal list-inside"></ol>'; }
                if (pathIndex >= path.length) return;
                const startNode = mapData.nodes.find(n => n.id === path[pathIndex]);
                if (!startNode) return;
                switchFloor(startNode.floor);
                setTimeout(() => {
                    let segment = []; let nextFloor = -1;
                    for (let i = pathIndex; i < path.length; i++) {
                        const currentNode = mapData.nodes.find(n => n.id === path[i]);
                        if (currentNode.floor === startNode.floor) { segment.push(path[i]); } 
                        else { nextFloor = currentNode.floor; break; }
                    }
                    drawSegment(segment);
                    if (nextFloor !== -1) { animatePath(path, pathIndex + segment.length); }
                }, 500);
            }

            function drawSegment(segment) {
                if (segment.length === 0) return;
                const instructionList = document.getElementById('instructionList');
                if (segment.length > 1) {
                    const points = segment.map(nodeId => { const node = mapData.nodes.find(n => n.id === nodeId); return `${node.x},${node.y}`; }).join(' ');
                    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
                    polyline.setAttribute('points', points); polyline.setAttribute('class', 'path');
                    if(mapSvg.firstChild) mapSvg.insertBefore(polyline, mapSvg.firstChild.nextSibling); else mapSvg.appendChild(polyline);
                }
                segment.forEach(nodeId => { const nodeEl = document.getElementById(nodeId); if (nodeEl) nodeEl.classList.add('highlight'); });
                for(let i = 0; i < segment.length - 1; i++){
                    const stepFrom = mapData.nodes.find(n => n.id === segment[i]);
                    const stepTo = mapData.nodes.find(n => n.id === segment[i+1]);
                    if (stepFrom.type === 'hallway' && stepTo.type === 'hallway') continue;
                    const li = document.createElement('li');
                    li.innerHTML = `Go from <strong>${stepFrom.name}</strong> to <strong>${stepTo.name}</strong>`;
                    instructionList.appendChild(li);
                }
            }
            
            function clearHighlights() {
                document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
                document.querySelectorAll('.path').forEach(el => el.remove());
                pathInstructions.innerHTML = '<p class="text-gray-500">Select a start and end point to see the route.</p>';
            }

            // --- ADMIN FUNCTIONALITY ---
            function showConfirmationModal(title, message, onConfirm) {
                modalTitle.textContent = title;
                modalMessage.textContent = message;
                modalConfirmCallback = onConfirm;
                modal.style.display = 'flex';
            }

            function hideConfirmationModal() {
                modal.style.display = 'none';
                modalConfirmCallback = null;
            }

            function toggleAdminMode(isAdminEnabled) { isAdmin = isAdminEnabled; adminPanel.classList.toggle('hidden', !isAdmin); setEditMode({mode: null}); drawCurrentFloor(); }
            function getMousePosition(evt) { const CTM = mapSvg.getScreenCTM(); return { x: (evt.clientX - CTM.e) / CTM.a, y: (evt.clientY - CTM.f) / CTM.d }; }
            function startDrag(evt, nodeId) { if (!isAdmin || editMode.mode) return; isDragging = true; const pos = getMousePosition(evt); const node = mapData.nodes.find(n => n.id === nodeId); offset.x = pos.x - node.x; offset.y = pos.y - node.y; }
            function drag(evt) { if (isDragging) { evt.preventDefault(); const pos = getMousePosition(evt); const g = document.getElementById(`g-${evt.target.id}`); const node = mapData.nodes.find(n => n.id === evt.target.id); if(!g || !node) return; node.x = Math.round(pos.x - offset.x); node.y = Math.round(pos.y - offset.y); drawCurrentFloor(); } }
            function endDrag() { isDragging = false; }
            function handleMapClick(evt) {
                if (!isAdmin) return;
                const targetId = evt.target.id;
                const targetNode = mapData.nodes.find(n => n.id === targetId);

                switch (editMode.mode) {
                    case 'add':
                        const pos = getMousePosition(evt);
                        const capitalType = editMode.type.charAt(0).toUpperCase() + editMode.type.slice(1);
                        const newNode = { id: `${editMode.type.charAt(0).toUpperCase()}-${currentFloor}-${Date.now()}`, name: `New ${capitalType}`, type: editMode.type, floor: currentFloor, x: Math.round(pos.x), y: Math.round(pos.y), access: editMode.access || 'all' };
                        mapData.nodes.push(newNode);
                        const nodesOnFloor = mapData.nodes.filter(n => n.floor === currentFloor && n.id !== newNode.id);
                        if(nodesOnFloor.length > 0) {
                            let closestNode = null; let minDistance = Infinity;
                            nodesOnFloor.forEach(node => { const dist = Math.hypot(node.x - newNode.x, node.y - newNode.y); if (dist < minDistance) { minDistance = dist; closestNode = node; } });
                            mapData.edges.push({ source: newNode.id, target: closestNode.id });
                        }
                        if(newNode.type === 'room') populateSelectors();
                        drawCurrentFloor();
                        break;
                    case 'connect':
                        if (!targetNode) return;
                        if (!editMode.firstNodeId) {
                            editMode.firstNodeId = targetId;
                            adminStatus.textContent = `Selected ${targetNode.name} on F${targetNode.floor}. Select second node.`;
                        } else {
                            if (editMode.firstNodeId === targetId) return;
                            const firstNode = mapData.nodes.find(n => n.id === editMode.firstNodeId);
                            if(firstNode.floor !== targetNode.floor) {
                                if (!((firstNode.type === 'stairs' && targetNode.type === 'stairs') || (firstNode.type === 'elevator' && targetNode.type === 'elevator'))) {
                                    adminStatus.textContent = "Error: Cross-floor links must be Stairs-to-Stairs or Elevator-to-Elevator.";
                                    setTimeout(() => setEditMode({mode: 'connect'}), 2000);
                                    return;
                                }
                            }
                            mapData.edges.push({ source: editMode.firstNodeId, target: targetId });
                            adminStatus.textContent = `Connected ${firstNode.name} and ${targetNode.name}!`;
                            setEditMode({mode: 'connect'});
                        }
                        drawCurrentFloor();
                        break;
                    case 'disconnect':
                         if (!targetNode) return;
                        if (!editMode.firstNodeId) {
                            editMode.firstNodeId = targetId;
                            adminStatus.textContent = `Selected ${targetNode.name}. Click second node to disconnect.`;
                        } else {
                            if (editMode.firstNodeId === targetId) return;
                            const firstNodeName = mapData.nodes.find(n => n.id === editMode.firstNodeId).name;
                            const originalEdgeCount = mapData.edges.length;
                            mapData.edges = mapData.edges.filter(e => 
                                !((e.source === editMode.firstNodeId && e.target === targetId) || (e.source === targetId && e.target === editMode.firstNodeId))
                            );
                            if(mapData.edges.length < originalEdgeCount) {
                                adminStatus.textContent = `Disconnected ${firstNodeName} and ${targetNode.name}.`;
                            } else {
                                adminStatus.textContent = `No direct connection found.`;
                            }
                            setEditMode({mode: 'disconnect'});
                        }
                        drawCurrentFloor();
                        break;
                    case 'delete-node':
                        if (!targetNode) return;
                        showConfirmationModal(`Delete ${targetNode.name}?`, 'This will permanently remove the node and its connections.', () => {
                            mapData.nodes = mapData.nodes.filter(n => n.id !== targetId);
                            mapData.edges = mapData.edges.filter(e => e.source !== targetId && e.target !== targetId);
                            if (targetNode.type === 'room') populateSelectors();
                            drawCurrentFloor();
                            hideConfirmationModal();
                            setEditMode({mode: 'delete-node'});
                        });
                        break;
                }
            }
             function handleDeleteFloor() {
                const floorCount = [...new Set(mapData.nodes.map(n => n.floor))].length;
                if (floorCount === 0) { adminStatus.textContent = "No floors to delete."; return; }
                if (floorCount <= 1 && mapData.nodes.length > 0) { adminStatus.textContent = "Cannot delete the last remaining floor."; return; }
                 showConfirmationModal(
                     `Delete Floor ${currentFloor}?`,
                     "This will remove all nodes and connections on this floor. This action cannot be undone.",
                     () => {
                        const nodesOnOtherFloors = mapData.nodes.filter(n => n.floor !== currentFloor);
                        const nodeIdsToKeep = new Set(nodesOnOtherFloors.map(n => n.id));
                        mapData.nodes = nodesOnOtherFloors;
                        mapData.edges = mapData.edges.filter(e => nodeIdsToKeep.has(e.source) && nodeIdsToKeep.has(e.target));
                        delete mapData.floorPlans[currentFloor];
                        
                        hideConfirmationModal();
                        populateSelectors();
                        // Switch to a valid floor, or reset if no floors are left.
                        const remainingFloors = [...new Set(mapData.nodes.map(n => n.floor))];
                        const newFloor = remainingFloors.length > 0 ? Math.min(...remainingFloors) : 1;
                        switchFloor(newFloor);
                     }
                 );
            }
            function handleAddNewFloor() {
                const existingFloors = [...new Set(mapData.nodes.map(n => n.floor))];
                let newFloorNum = 1;
                if (existingFloors.length > 0) {
                    newFloorNum = Math.max(...existingFloors) + 1;
                }
                const lastFloorNum = newFloorNum - 1;
                
                const lastFloorStairs = mapData.nodes.find(n => n.floor === lastFloorNum && n.type === 'stairs');
                const lastFloorEmpElevator = mapData.nodes.find(n => n.floor === lastFloorNum && n.type === 'elevator' && n.access === 'employee');
                const lastFloorPubElevator = mapData.nodes.find(n => n.floor === lastFloorNum && n.type === 'elevator' && n.access === 'all');
                
                if(lastFloorNum > 0) { // Only try to link if there was a floor before
                    if (lastFloorStairs) {
                        const newId = `S-${newFloorNum}-W2`;
                        mapData.nodes.push({ id: newId, name: "Stairs", type: "stairs", floor: newFloorNum, x: lastFloorStairs.x, y: lastFloorStairs.y, access: 'all' });
                        mapData.edges.push({ source: lastFloorStairs.id, target: newId });
                    }
                    if (lastFloorEmpElevator) {
                        const newId = `E-${newFloorNum}-C`;
                        mapData.nodes.push({ id: newId, name: "Elevator (Emp)", type: "elevator", floor: newFloorNum, x: lastFloorEmpElevator.x, y: lastFloorEmpElevator.y, access: "employee" });
                        mapData.edges.push({ source: lastFloorEmpElevator.id, target: newId });
                    }
                    if (lastFloorPubElevator) {
                        const newId = `E-${newFloorNum}-Pub`;
                        mapData.nodes.push({ id: newId, name: "Elevator", type: "elevator", floor: newFloorNum, x: lastFloorPubElevator.x, y: lastFloorPubElevator.y, access: "all" });
                        mapData.edges.push({ source: lastFloorPubElevator.id, target: newId });
                    }
                }
                adminStatus.textContent = `Floor ${newFloorNum} added successfully!`; 
                switchFloor(newFloorNum);
            }
             function setEditMode({ mode, type = null, access = 'all' }) {
                const wasActive = document.querySelector('.admin-add-btn.active');
                const clickedBtn = document.querySelector(`.admin-add-btn[data-mode="${mode}"]` + (type ? `[data-type="${type}"][data-access="${access}"]` : ''));
                
                if (wasActive === clickedBtn) {
                    editMode = { mode: null, firstNodeId: null };
                    if(wasActive) wasActive.classList.remove('active');
                     adminStatus.textContent = 'Drag nodes to move them or select an action.';
                } else {
                    editMode = { mode, type, access, firstNodeId: null };
                    document.querySelectorAll('.admin-add-btn.active').forEach(b => b.classList.remove('active'));
                    if(clickedBtn) clickedBtn.classList.add('active');

                    switch (mode) {
                        case 'add': adminStatus.textContent = `Click map to add new ${type}.`; break;
                        case 'connect': adminStatus.textContent = `Click first node to connect.`; break;
                        case 'disconnect': adminStatus.textContent = `Click first node to disconnect.`; break;
                        case 'delete-node': adminStatus.textContent = `Click a node to delete it.`; break;
                        default: adminStatus.textContent = 'Drag nodes to move them or select an action.';
                    }
                }
                 drawCurrentFloor();
            }
            function handleFloorImageUpload(event) {
                const file = event.target.files[0];
                if (!file || !file.type.startsWith('image/')) return;
                const reader = new FileReader();
                reader.onload = (e) => { mapData.floorPlans[currentFloor] = e.target.result; drawCurrentFloor(); };
                reader.readAsDataURL(file);
            }
            function handleClearFloorImage() {
                if (mapData.floorPlans && mapData.floorPlans[currentFloor]) { delete mapData.floorPlans[currentFloor]; drawCurrentFloor(); }
            }

            function handleExportMapData() {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mapData, null, 2));
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", dataStr);
                downloadAnchorNode.setAttribute("download", "school_map_data.json");
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
                adminStatus.textContent = "Map data exported successfully!";
            }

            function handleImportMapData(event) {
                const file = event.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const importedData = JSON.parse(e.target.result);
                        if (importedData && importedData.nodes && importedData.edges) {
                            mapData = importedData;
                            adminStatus.textContent = "Map data imported successfully!";
                            // Reset and refresh the entire UI
                            populateSelectors();
                            const firstFloor = mapData.nodes.length > 0 ? Math.min(...mapData.nodes.map(n => n.floor)) : 1;
                            switchFloor(firstFloor);
                        } else {
                            adminStatus.textContent = "Error: Invalid JSON file structure.";
                        }
                    } catch (error) {
                        adminStatus.textContent = "Error parsing JSON file. Please check the file format.";
                        console.error("JSON Parse Error:", error);
                    }
                };
                reader.readAsText(file);
                event.target.value = ''; // Reset file input
            }


            // --- INITIALIZATION ---
            populateSelectors(); updateFloorButtons(); switchFloor(1);
            userRoleSelect.addEventListener('change', (e) => toggleAdminMode(e.target.value === 'admin'));
            findPathBtn.addEventListener('click', handleFindPath);
            startNodeSelect.addEventListener('change', clearHighlights);
            endNodeSelect.addEventListener('change', clearHighlights);
            mapSvg.addEventListener('mousemove', drag); mapSvg.addEventListener('mouseup', endDrag);
            mapSvg.addEventListener('mouseleave', endDrag);
            mapSvg.addEventListener('click', handleMapClick);
            addFloorBtn.addEventListener('click', handleAddNewFloor);
            deleteFloorBtn.addEventListener('click', handleDeleteFloor);
            document.querySelectorAll('.admin-add-btn').forEach(btn => { 
                btn.addEventListener('click', () => setEditMode({ mode: btn.dataset.mode, type: btn.dataset.type, access: btn.dataset.access })); 
            });
            floorImageInput.addEventListener('change', handleFloorImageUpload);
            clearFloorImageBtn.addEventListener('click', handleClearFloorImage);
            modalCancelBtn.addEventListener('click', hideConfirmationModal);
            modalConfirmBtn.addEventListener('click', () => {
                if (modalConfirmCallback) modalConfirmCallback();
            });
            exportMapBtn.addEventListener('click', handleExportMapData);
            importMapInput.addEventListener('change', handleImportMapData);
        });

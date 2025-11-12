App.AdminEditor = {
    editMode: { mode: null, firstNodeId: null },
    isDragging: false,
    offset: { x: 0, y: 0 },
    draggedNodeId: null,
    
    adminDOMElements: {
        addFloorBtn: document.getElementById('addFloorBtn'),
        deleteFloorBtn: document.getElementById('deleteFloorBtn'),
        setFloorLabelBtn: document.getElementById('setFloorLabelBtn'),
        importMapInput: document.getElementById('importMapInput'),
        exportMapBtn: document.getElementById('exportMapBtn'),
        adminAddBtns: document.querySelectorAll('.admin-add-btn')
        saveToDbBtn: document.getElementById('saveToDbBtn'), //
    },

    init: () => {
        const controls = App.AdminEditor.adminDOMElements;
        controls.addFloorBtn.addEventListener('click', App.AdminEditor.handleAddNewFloor);
        controls.deleteFloorBtn.addEventListener('click', App.AdminEditor.handleDeleteFloor);
        controls.setFloorLabelBtn.addEventListener('click', App.AdminEditor.handleSetFloorLabel);
        controls.exportMapBtn.addEventListener('click', App.AdminEditor.handleExportMapData);
        controls.importMapInput.addEventListener('change', App.AdminEditor.handleImportMapData);
        
        controls.adminAddBtns.forEach(btn => { 
            btn.addEventListener('click', App.AdminEditor.handleSetEditMode); 
        });

        window.addEventListener('mousemove', App.AdminEditor.drag);
        window.addEventListener('mouseup', App.AdminEditor.endDrag);
        window.addEventListener('mouseleave', App.AdminEditor.endDrag);
    },

    shutdown: () => {
        const controls = App.AdminEditor.adminDOMElements;
        controls.addFloorBtn.removeEventListener('click', App.AdminEditor.handleAddNewFloor);
        controls.deleteFloorBtn.removeEventListener('click', App.AdminEditor.handleDeleteFloor);
        controls.setFloorLabelBtn.removeEventListener('click', App.AdminEditor.handleSetFloorLabel);
        controls.exportMapBtn.removeEventListener('click', App.AdminEditor.handleExportMapData);
        controls.importMapInput.removeEventListener('change', App.AdminEditor.handleImportMapData);

        controls.adminAddBtns.forEach(btn => { 
            btn.removeEventListener('click', App.AdminEditor.handleSetEditMode); 
        });

        window.removeEventListener('mousemove', App.AdminEditor.drag);
        window.removeEventListener('mouseup', App.AdminEditor.endDrag);
        window.removeEventListener('mouseleave', App.AdminEditor.endDrag);
        
        App.AdminEditor.setEditMode({ mode: null });
    },
    
    handleSetEditMode: (event) => {
        const btn = event.currentTarget;
        const mode = btn.dataset.mode;
        const type = btn.dataset.type;
        const access = btn.dataset.access;
        App.AdminEditor.setEditMode({ mode, type, access });
    },

    getMousePosition: (evt) => {
        const CTM = App.DOM.mapSvg.getScreenCTM();
        return { x: (evt.clientX - CTM.e) / CTM.a, y: (evt.clientY - CTM.f) / CTM.d };
    },
    
    startDrag: (evt, nodeId) => {
        if (App.AdminEditor.editMode.mode) return;
        
        evt.preventDefault();
        App.AdminEditor.isDragging = true;
        App.AdminEditor.draggedNodeId = nodeId;
        
        const pos = App.AdminEditor.getMousePosition(evt);
        const node = App.mapData.nodes.find(n => n.id === nodeId);
        App.AdminEditor.offset.x = pos.x - node.x;
        App.AdminEditor.offset.y = pos.y - node.y;
        
        document.body.classList.add('is-dragging');
    },
    
    drag: (evt) => {
        if (!App.AdminEditor.isDragging) return;
        
        evt.preventDefault();
        const pos = App.AdminEditor.getMousePosition(evt);
        const node = App.mapData.nodes.find(n => n.id === App.AdminEditor.draggedNodeId);
        
        if (!node) {
            App.AdminEditor.endDrag();
            return;
        }
        
        node.x = Math.round(pos.x - App.AdminEditor.offset.x);
        node.y = Math.round(pos.y - App.AdminEditor.offset.y);
        
        App.Renderer.redrawMapElements();
    },
    
    endDrag: () => {
        if (!App.AdminEditor.isDragging) return;
        
        App.AdminEditor.isDragging = false;
        App.AdminEditor.draggedNodeId = null;
        document.body.classList.remove('is-dragging');
    },
    
    handleMapClick: (evt) => {
        const targetId = evt.target.id;
        const targetNode = App.mapData.nodes.find(n => n.id === targetId);
        const editMode = App.AdminEditor.editMode;
        const floor = App.State.currentFloor;
        const getFloorLabel = (floorNum) => (App.mapData.floorLabels && App.mapData.floorLabels[floorNum]) ? App.mapData.floorLabels[floorNum] : `F${floorNum}`;

        switch (editMode.mode) {
            case 'add':
                if (targetNode) return;

                const pos = App.AdminEditor.getMousePosition(evt);
                const capitalType = editMode.type.charAt(0).toUpperCase() + editMode.type.slice(1);
                
                let nodeName = `New ${capitalType}`;
                if (editMode.type === 'stairs') nodeName = 'Stairs';
                if (editMode.type === 'elevator' && editMode.access === 'all') nodeName = 'Elevator';
                if (editMode.type === 'elevator' && editMode.access === 'employee') nodeName = 'Elevator (Emp)';
                if (editMode.type === 'hallway') nodeName = 'Hallway';

                const newNode = { id: `${editMode.type.charAt(0).toUpperCase()}-${floor}-${Date.now()}`, name: nodeName, type: editMode.type, floor: floor, x: Math.round(pos.x), y: Math.round(pos.y), access: editMode.access || 'all' };
                App.mapData.nodes.push(newNode);
                
                const nodesOnFloor = App.mapData.nodes.filter(n => n.floor === floor && n.id !== newNode.id);
                if(nodesOnFloor.length > 0) {
                    let closestNode = null; let minDistance = Infinity;
                    nodesOnFloor.forEach(node => { const dist = Math.hypot(node.x - newNode.x, node.y - newNode.y); if (dist < minDistance) { minDistance = dist; closestNode = node; } });
                    App.mapData.edges.push({ source: newNode.id, target: closestNode.id });
                }
                
                if(newNode.type === 'room') App.Renderer.populateSelectors();
                App.Renderer.redrawMapElements();
                break;
            case 'connect':
                if (!targetNode) return;
                if (!editMode.firstNodeId) {
                    editMode.firstNodeId = targetId;
                    App.DOM.adminStatus.textContent = `Selected ${targetNode.name} on ${getFloorLabel(targetNode.floor)}. Select second node.`;
                } else {
                    if (editMode.firstNodeId === targetId) return;
                    const firstNode = App.mapData.nodes.find(n => n.id === editMode.firstNodeId);
                    if(firstNode.floor !== targetNode.floor) {
                        if (!((firstNode.type === 'stairs' && targetNode.type === 'stairs') || (firstNode.type === 'elevator' && targetNode.type === 'elevator'))) {
                            App.DOM.adminStatus.textContent = "Error: Cross-floor links must be Stairs-to-Stairs or Elevator-to-Elevator.";
                            setTimeout(() => App.AdminEditor.setEditMode({mode: 'connect'}), 2000);
                            return;
                        }
                    }
                    App.mapData.edges.push({ source: editMode.firstNodeId, target: targetId });
                    App.DOM.adminStatus.textContent = `Connected ${firstNode.name} and ${targetNode.name}!`;
                    App.AdminEditor.setEditMode({mode: 'connect'});
                }
                App.Renderer.redrawMapElements();
                break;
            case 'disconnect':
                 if (!targetNode) return;
                if (!editMode.firstNodeId) {
                    editMode.firstNodeId = targetId;
                    App.DOM.adminStatus.textContent = `Selected ${targetNode.name}. Click second node to disconnect.`;
                } else {
                    if (editMode.firstNodeId === targetId) return;
                    const firstNodeName = App.mapData.nodes.find(n => n.id === editMode.firstNodeId).name;
                    const originalEdgeCount = App.mapData.edges.length;
                    App.mapData.edges = App.mapData.edges.filter(e => 
                        !((e.source === editMode.firstNodeId && e.target === targetId) || (e.source === targetId && e.target === editMode.firstNodeId))
                    );
                    if(App.mapData.edges.length < originalEdgeCount) {
                        App.DOM.adminStatus.textContent = `Disconnected ${firstNodeName} and ${targetNode.name}.`;
                    } else {
                        App.DOM.adminStatus.textContent = `No direct connection found.`;
                    }
                    App.AdminEditor.setEditMode({mode: 'disconnect'});
                }
                App.Renderer.redrawMapElements();
                break;
            case 'delete-node':
                if (!targetNode) return;
                App.Modal.show(`Delete ${targetNode.name}?`, 'This will permanently remove the node and its connections.', () => {
                    App.mapData.nodes = App.mapData.nodes.filter(n => n.id !== targetId);
                    App.mapData.edges = App.mapData.edges.filter(e => e.source !== targetId && e.target !== targetId);
                    
                    if (targetNode.type === 'room') App.Renderer.populateSelectors();
                    App.Renderer.redrawMapElements();
                    App.Modal.hide();
                    App.AdminEditor.setEditMode({mode: 'delete-node'});
                });
                break;
            case 'rename-node':
                if (!targetNode) return;
                if (targetNode.type !== 'room') {
                    App.DOM.adminStatus.textContent = 'Only rooms can be renamed.';
                    return;
                }
                const newName = prompt(`Enter new name for "${targetNode.name}":`, targetNode.name);
                if (newName && newName.trim() !== '') {
                    targetNode.name = newName.trim();
                    App.DOM.adminStatus.textContent = `Renamed node to "${targetNode.name}".`;
                    App.Renderer.redrawMapElements();
                    App.Renderer.populateSelectors();
                }
                App.AdminEditor.setEditMode({mode: 'rename-node'});
                break;
        }
    },
    
     handleDeleteFloor: () => {
        const floorCount = [...new Set(App.mapData.nodes.map(n => n.floor))].length;
        if (floorCount === 0) { App.DOM.adminStatus.textContent = "No floors to delete."; return; }
        if (floorCount <= 1 && App.mapData.nodes.length > 0) { App.DOM.adminStatus.textContent = "Cannot delete the last remaining floor."; return; }
         
        const getFloorLabel = (floorNum) => (App.mapData.floorLabels && App.mapData.floorLabels[floorNum]) ? App.mapData.floorLabels[floorNum] : `Floor ${floorNum}`;

        App.Modal.show(
             `Delete ${getFloorLabel(App.State.currentFloor)}?`,
             "This will remove all nodes and connections on this floor. This action cannot be undone.",
             () => {
                const nodesOnOtherFloors = App.mapData.nodes.filter(n => n.floor !== App.State.currentFloor);
                const nodeIdsToKeep = new Set(nodesOnOtherFloors.map(n => n.id));
                App.mapData.nodes = nodesOnOtherFloors;
                App.mapData.edges = App.mapData.edges.filter(e => nodeIdsToKeep.has(e.source) && nodeIdsToKeep.has(e.target));
                
                App.Modal.hide();
                App.Renderer.populateSelectors();
                const remainingFloors = [...new Set(App.mapData.nodes.map(n => n.floor))];
                const newFloor = remainingFloors.length > 0 ? Math.min(...remainingFloors) : 1;
                App.Renderer.switchFloor(newFloor);
             }
         );
    },
    
    handleAddNewFloor: () => {
        const existingFloors = [...new Set(App.mapData.nodes.map(n => n.floor))];
        let newFloorNum = 1;
        if (existingFloors.length > 0) {
            newFloorNum = Math.max(...existingFloors) + 1;
        }
        const lastFloorNum = newFloorNum - 1;
        
        const lastFloorStairs = App.mapData.nodes.find(n => n.floor === lastFloorNum && n.type === 'stairs');
        const lastFloorEmpElevator = App.mapData.nodes.find(n => n.floor === lastFloorNum && n.type === 'elevator' && n.access === 'employee');
        const lastFloorPubElevator = App.mapData.nodes.find(n => n.floor === lastFloorNum && n.type === 'elevator' && n.access === 'all');
        
        if(lastFloorNum > 0) {
            if (lastFloorStairs) {
                const newId = `S-${newFloorNum}-W2`;
                App.mapData.nodes.push({ id: newId, name: "Stairs", type: "stairs", floor: newFloorNum, x: lastFloorStairs.x, y: lastFloorStairs.y, access: 'all' });
                App.mapData.edges.push({ source: lastFloorStairs.id, target: newId });
            }
            if (lastFloorEmpElevator) {
                const newId = `E-${newFloorNum}-C`;
                App.mapData.nodes.push({ id: newId, name: "Elevator (Emp)", type: "elevator", floor: newFloorNum, x: lastFloorEmpElevator.x, y: lastFloorEmpElevator.y, access: "employee" });
                App.mapData.edges.push({ source: lastFloorEmpElevator.id, target: newId });
            }
            if (lastFloorPubElevator) {
                const newId = `E-${newFloorNum}-Pub`;
                App.mapData.nodes.push({ id: newId, name: "Elevator", type: "elevator", floor: newFloorNum, x: lastFloorPubElevator.x, y: lastFloorPubElevator.y, access: "all" });
                App.mapData.edges.push({ source: lastFloorPubElevator.id, target: newId });
            }
        }
        App.DOM.adminStatus.textContent = `Floor ${newFloorNum} added successfully!`; 
        App.Renderer.switchFloor(newFloorNum);
    },
    
    handleSetFloorLabel: () => {
        if (!App.mapData.floorLabels) {
            App.mapData.floorLabels = {};
        }
        const currentLabel = App.mapData.floorLabels[App.State.currentFloor] || `Floor ${App.State.currentFloor}`;
        const newLabel = prompt(`Enter display label for Floor ${App.State.currentFloor}:`, currentLabel.replace('Floor ', ''));

        if (newLabel && newLabel.trim() !== '') {
            App.mapData.floorLabels[App.State.currentFloor] = newLabel.trim();
            App.DOM.adminStatus.textContent = `Floor ${App.State.currentFloor} label set to "${newLabel.trim()}".`;
        } else if (newLabel === '') {
            delete App.mapData.floorLabels[App.State.currentFloor];
            App.DOM.adminStatus.textContent = `Floor ${App.State.currentFloor} label reset to default.`;
        }
        App.Renderer.updateFloorButtons();
    },
    
     setEditMode: ({ mode, type = null, access = 'all' }) => {
        if (App.AdminEditor.isDragging) {
            App.AdminEditor.endDrag();
        }

        const wasActive = document.querySelector('.admin-add-btn.active');
        let clickedBtnQuery = `.admin-add-btn[data-mode="${mode}"]`;
        if (type) {
            clickedBtnQuery += `[data-type="${type}"]`;
            if (access) {
                clickedBtnQuery += `[data-access="${access}"]`;
            }
        }
        const clickedBtn = document.querySelector(clickedBtnQuery);
        
        let newModeActive = false;

        if (wasActive === clickedBtn) {
            App.AdminEditor.editMode = { mode: null, firstNodeId: null };
            if(wasActive) wasActive.classList.remove('active');
             App.DOM.adminStatus.textContent = 'Drag nodes to move them or select an action.';
        } else {
            newModeActive = true;
            App.AdminEditor.editMode = { mode, type, access, firstNodeId: null };
            document.querySelectorAll('.admin-add-btn.active').forEach(b => b.classList.remove('active'));
            if(clickedBtn) clickedBtn.classList.add('active');

            switch (mode) {
                case 'add': App.DOM.adminStatus.textContent = `Click map to add new ${type}.`; break;
                case 'connect': App.DOM.adminStatus.textContent = `Click first node to connect.`; break;
                case 'disconnect': App.DOM.adminStatus.textContent = `Click first node to disconnect.`; break;
                case 'delete-node': App.DOM.adminStatus.textContent = `Click a node to delete it.`; break;
                case 'rename-node': App.DOM.adminStatus.textContent = `Click a room to rename it.`; break;
                default: App.DOM.adminStatus.textContent = 'Drag nodes to move them or select an action.';
            }
        }
        
        let cursorStyle = 'default';
        if (newModeActive) {
            switch (mode) {
                case 'add': cursorStyle = 'crosshair'; break;
                case 'connect':
                case 'disconnect':
                case 'delete-node': 
                case 'rename-node': cursorStyle = 'pointer'; break;
            }
        }
        App.DOM.mapSvg.style.cursor = cursorStyle;
         
        App.Renderer.redrawMapElements();
    },

    handleExportMapData: () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(App.mapData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "school_map_data.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        App.DOM.adminStatus.textContent = "Map data exported successfully!";
    },

    handleImportMapData: (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (importedData && importedData.nodes && importedData.edges) {
                    App.mapData = importedData;
                    App.DOM.adminStatus.textContent = "Map data imported successfully!";
                    App.Renderer.populateSelectors();
                    const firstFloor = App.mapData.nodes.length > 0 ? Math.min(...App.mapData.nodes.map(n => n.floor)) : 1;
                    App.Renderer.switchFloor(firstFloor);
                } else {
                    App.DOM.adminStatus.textContent = "Error: Invalid JSON file structure.";
                }
            } catch (error) {
                App.DOM.adminStatus.textContent = "Error parsing JSON file. Please check the file format.";
                console.error("JSON Parse Error:", error);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }
};
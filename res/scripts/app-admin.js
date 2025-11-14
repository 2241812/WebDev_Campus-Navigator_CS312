/**
 * @namespace App.AdminEditor
 * @description Manages all functionality for the map administration interface,
 * including adding/deleting nodes, floors, and handling data import/export.
 */
App.AdminEditor = {
    // -------------------------------------------------------------------------
    // Properties
    // -------------------------------------------------------------------------

    /**
     * @property {object} editMode - Stores the current editor state.
     * @property {string|null} editMode.mode - The current action (e.g., 'add', 'connect', 'delete-node').
     * @property {string|null} editMode.type - The type of node to add (e.g., 'room', 'stairs').
     * @property {string|null} editMode.access - The access level for the node (e.g., 'all', 'employee').
     * @property {string|null} editMode.firstNodeId - Used in 'connect'/'disconnect' modes to store the first clicked node.
     */
    editMode: {
        mode: null,
        type: null,
        access: null,
        firstNodeId: null
    },

    /** @property {boolean} isDragging - True if a node is currently being dragged. */
    isDragging: false,

    /** @property {object} offset - Stores the (x, y) offset from a node's origin to the mouse pointer during a drag. */
    offset: { x: 0, y: 0 },

    /** @property {string|null} draggedNodeId - The ID of the node currently being dragged. */
    draggedNodeId: null,

    /**
     * @property {object} adminDOMElements - Cached references to DOM elements used by the admin panel.
     */
    adminDOMElements: {
        addFloorBtn: document.getElementById('addFloorBtn'),
        deleteFloorBtn: document.getElementById('deleteFloorBtn'),
        setFloorLabelBtn: document.getElementById('setFloorLabelBtn'),
        importMapInput: document.getElementById('importMapInput'),
        exportMapBtn: document.getElementById('exportMapBtn'),
        adminAddBtns: document.querySelectorAll('.admin-add-btn'),
        saveToDbBtn: document.getElementById('saveToDbBtn')
    },
    
    /**
     * @property {object} constants - Shared constants for the editor.
     */
    constants: {
        STATUS_COLORS: {
            WARNING: "#F6AD55", // Yellow
            SUCCESS: "#68D391", // Green
            ERROR: "#F56565",   // Red
            DEFAULT: ""
        }
    },

    // -------------------------------------------------------------------------
    // Initialization & Shutdown
    // -------------------------------------------------------------------------

    /**
     * Initializes the admin editor, caching DOM elements and attaching event listeners.
     */
    init: () => {
        const controls = App.AdminEditor.adminDOMElements;
        controls.addFloorBtn.addEventListener('click', App.AdminEditor.handleAddNewFloor);
        controls.deleteFloorBtn.addEventListener('click', App.AdminEditor.handleDeleteFloor);
        controls.setFloorLabelBtn.addEventListener('click', App.AdminEditor.handleSetFloorLabel);
        controls.exportMapBtn.addEventListener('click', App.AdminEditor.handleExportMapData);
        controls.importMapInput.addEventListener('change', App.AdminEditor.handleImportMapData);

        if (controls.saveToDbBtn) {
            controls.saveToDbBtn.addEventListener('click', App.AdminEditor.handleSaveMapToDatabase);
        }

        controls.adminAddBtns.forEach(btn => {
            btn.addEventListener('click', App.AdminEditor.handleSetEditMode);
        });

        // Global listeners for dragging
        window.addEventListener('mousemove', App.AdminEditor.drag);
        window.addEventListener('mouseup', App.AdminEditor.endDrag);
        window.addEventListener('mouseleave', App.AdminEditor.endDrag);
    },

    /**
     * Shuts down the admin editor, removing all event listeners to prevent memory leaks
     * and reset state.
     */
    shutdown: () => {
        const controls = App.AdminEditor.adminDOMElements;
        controls.addFloorBtn.removeEventListener('click', App.AdminEditor.handleAddNewFloor);
        controls.deleteFloorBtn.removeEventListener('click', App.AdminEditor.handleDeleteFloor);
        controls.setFloorLabelBtn.removeEventListener('click', App.AdminEditor.handleSetFloorLabel);
        controls.exportMapBtn.removeEventListener('click', App.AdminEditor.handleExportMapData);
        controls.importMapInput.removeEventListener('change', App.AdminEditor.handleImportMapData);

        if (controls.saveToDbBtn) {
            controls.saveToDbBtn.removeEventListener('click', App.AdminEditor.handleSaveMapToDatabase);
        }

        controls.adminAddBtns.forEach(btn => {
            btn.removeEventListener('click', App.AdminEditor.handleSetEditMode);
        });

        window.removeEventListener('mousemove', App.AdminEditor.drag);
        window.removeEventListener('mouseup', App.AdminEditor.endDrag);
        window.removeEventListener('mouseleave', App.AdminEditor.endDrag);

        App.AdminEditor.setEditMode({ mode: null });
    },

    // -------------------------------------------------------------------------
    // Event Handlers (DOM)
    // -------------------------------------------------------------------------

    /**
     * Handles clicks on the admin tool buttons (e.g., 'Add Room', 'Connect').
     * @param {Event} event - The click event from the tool button.
     */
    handleSetEditMode: (event) => {
        const btn = event.currentTarget;
        const mode = btn.dataset.mode;
        const type = btn.dataset.type;
        const access = btn.dataset.access;
        App.AdminEditor.setEditMode({ mode, type, access });
    },

    /**
     * Main click handler for the SVG map. Dispatches to other handlers
     * based on the current editMode.
     * @param {Event} evt - The click event on the SVG map.
     */
    handleMapClick: (evt) => {
        const targetId = evt.target.id;
        const targetNode = App.mapData.nodes.find(n => n.id === targetId);
        const editMode = App.AdminEditor.editMode;

        switch (editMode.mode) {
            case 'add':
                // Only add if clicking on empty space
                if (targetNode) return;
                const pos = App.AdminEditor.getMousePosition(evt);
                App.AdminEditor._handleAddNode(pos);
                break;
            case 'connect':
                App.AdminEditor._handleConnectNode(targetNode);
                break;
            case 'disconnect':
                App.AdminEditor._handleDisconnectNode(targetNode);
                break;
            case 'delete-node':
                App.AdminEditor._handleDeleteNode(targetNode);
                break;
            case 'rename-node':
                App.AdminEditor._handleRenameNode(targetNode);
                break;
        }
    },

    /**
     * Handles adding a new floor.
     */
    handleAddNewFloor: () => {
        const existingFloors = [...new Set(App.mapData.nodes.map(n => n.floor))];
        let newFloorNum = 1;
        if (existingFloors.length > 0) {
            newFloorNum = Math.max(...existingFloors) + 1;
        }
        const lastFloorNum = newFloorNum - 1;

        let nodesAddedToNewFloor = 0;

        // Find connection nodes (stairs, elevators) from the last floor to copy
        const lastFloorStairs = App.mapData.nodes.find(n => n.floor === lastFloorNum && n.type === 'stairs');
        const lastFloorEmpElevator = App.mapData.nodes.find(n => n.floor === lastFloorNum && n.type === 'elevator' && n.access === 'employee');
        const lastFloorPubElevator = App.mapData.nodes.find(n => n.floor === lastFloorNum && n.type === 'elevator' && n.access === 'all');
        
        // Find the floor plan from the last floor to copy
        const lastFloorPlan = (App.mapData.floorPlans && App.mapData.floorPlans[lastFloorNum]) 
            ? App.mapData.floorPlans[lastFloorNum] 
            : null;

        if (lastFloorNum > 0) {
            // Helper to create a new node and edge
            const copyConnectionNode = (node, newId, newName, newType, newAccess) => {
                App.mapData.nodes.push({ id: newId, name: newName, type: newType, floor: newFloorNum, x: node.x, y: node.y, access: newAccess });
                App.mapData.edges.push({ source: node.id, target: newId });
                nodesAddedToNewFloor++;
            };

            // Copy stairs
            if (lastFloorStairs) {
                copyConnectionNode(lastFloorStairs, `S-${newFloorNum}-W2`, "Stairs", "stairs", "all");
            }
            // Copy employee elevator
            if (lastFloorEmpElevator) {
                copyConnectionNode(lastFloorEmpElevator, `E-${newFloorNum}-C`, "Elevator (Emp)", "elevator", "employee");
            }
            // Copy public elevator
            if (lastFloorPubElevator) {
                copyConnectionNode(lastFloorPubElevator, `E-${newFloorNum}-Pub`, "Elevator", "elevator", "all");
            }
            
            // If we found a floor plan, copy it to the new floor's data
            if (lastFloorPlan) {
                if (!App.mapData.floorPlans) {
                    App.mapData.floorPlans = {};
                }
                App.mapData.floorPlans[newFloorNum] = lastFloorPlan;
            }
        }

        // If no nodes were added (e.g., first floor or empty floor),
        // add one default node to make the floor "exist".
        if (nodesAddedToNewFloor === 0) {
            App.mapData.nodes.push({
                id: `H-${newFloorNum}-START`,
                name: "Hallway",
                type: "hallway",
                floor: newFloorNum,
                x: 400, // Default center coordinates
                y: 250, // Default center coordinates
                access: "all"
            });
        }

        App.DOM.adminStatus.textContent = `Floor ${newFloorNum} added successfully!`;
        App.Renderer.switchFloor(newFloorNum);
    },

    /**
     * Handles deleting the current floor after confirmation.
     */
    handleDeleteFloor: () => {
        const floorCount = [...new Set(App.mapData.nodes.map(n => n.floor))].length;
        if (floorCount === 0) {
            App.DOM.adminStatus.textContent = "No floors to delete.";
            return;
        }
        if (floorCount <= 1 && App.mapData.nodes.length > 0) {
            App.DOM.adminStatus.textContent = "Cannot delete the last remaining floor.";
            return;
        }

        const floorLabel = App.AdminEditor._getFloorLabel(App.State.currentFloor);

        App.Modal.show(
            `Delete ${floorLabel}?`,
            "This will remove all nodes and connections on this floor. This action cannot be undone.",
            () => {
                // Filter out nodes on the current floor
                const nodesOnOtherFloors = App.mapData.nodes.filter(n => n.floor !== App.State.currentFloor);
                const nodeIdsToKeep = new Set(nodesOnOtherFloors.map(n => n.id));

                // Update map data
                App.mapData.nodes = nodesOnOtherFloors;
                // Filter edges to only include those connecting nodes we are keeping
                App.mapData.edges = App.mapData.edges.filter(e => nodeIdsToKeep.has(e.source) && nodeIdsToKeep.has(e.target));

                App.Modal.hide();
                App.Renderer.populateSelectors(); // Repopulate start/end dropdowns

                // Switch to a remaining floor
                const remainingFloors = [...new Set(App.mapData.nodes.map(n => n.floor))];
                const newFloor = remainingFloors.length > 0 ? Math.min(...remainingFloors) : 1;
                App.Renderer.switchFloor(newFloor);
            }
        );
    },

    /**
     * Handles setting a custom display label for the current floor.
     */
    handleSetFloorLabel: () => {
        if (!App.mapData.floorLabels) {
            App.mapData.floorLabels = {};
        }
        const currentLabel = App.mapData.floorLabels[App.State.currentFloor] || `Floor ${App.State.currentFloor}`;
        // Prompt, using the current label as a default (but removing "Floor ")
        const newLabel = prompt(`Enter display label for Floor ${App.State.currentFloor}:`, currentLabel.replace('Floor ', ''));

        if (newLabel && newLabel.trim() !== '') {
            // Set new label
            App.mapData.floorLabels[App.State.currentFloor] = newLabel.trim();
            App.DOM.adminStatus.textContent = `Floor ${App.State.currentFloor} label set to "${newLabel.trim()}".`;
        } else if (newLabel === '') {
            // Clear the custom label if input is empty
            delete App.mapData.floorLabels[App.State.currentFloor];
            App.DOM.adminStatus.textContent = `Floor ${App.State.currentFloor} label reset to default.`;
        }
        // No change if user cancelled (null)
        App.Renderer.updateFloorButtons();
    },

    /**
     * Handles exporting the current map data (App.mapData) as a JSON file.
     */
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

    /**
     * Handles importing map data from a user-selected JSON file.
     * @param {Event} event - The 'change' event from the file input.
     */
    handleImportMapData: (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                // Basic validation
                if (importedData && importedData.nodes && importedData.edges) {
                    App.mapData = importedData;
                    App.DOM.adminStatus.textContent = "Map data imported successfully!";
                    App.Renderer.populateSelectors();
                    // Switch to the first available floor
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
        // Clear the input value to allow re-importing the same file
        event.target.value = '';
    },

    /**
     * Saves the current App.mapData to the server via a POST request.
     */
    handleSaveMapToDatabase: () => {
        const statusEl = App.DOM.adminStatus;
        if (!App.mapData || !App.mapData.nodes || !App.mapData.edges) {
            statusEl.textContent = "Error: No map data to save.";
            statusEl.style.color = App.AdminEditor.constants.STATUS_COLORS.ERROR;
            return;
        }

        statusEl.textContent = "Saving to database...";
        statusEl.style.color = App.AdminEditor.constants.STATUS_COLORS.WARNING;

        fetch('res/api/saveMapData.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(App.mapData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                statusEl.textContent = data.message || "Map saved successfully!";
                statusEl.style.color = App.AdminEditor.constants.STATUS_COLORS.SUCCESS;
            } else {
                statusEl.textContent = data.message || "Failed to save map.";
                statusEl.style.color = App.AdminEditor.constants.STATUS_COLORS.ERROR;
            }
        })
        .catch(error => {
            console.error('Error saving map data:', error);
            statusEl.textContent = "Error: Could not connect to server.";
            statusEl.style.color = App.AdminEditor.constants.STATUS_COLORS.ERROR;
        })
        .finally(() => {
            // Reset status message after 3 seconds
            setTimeout(() => {
                statusEl.style.color = App.AdminEditor.constants.STATUS_COLORS.DEFAULT;
                // Restore the appropriate status text for the current mode
                App.AdminEditor._updateStatusText();
            }, 3000);
        });
    },

    // -------------------------------------------------------------------------
    // Drag and Drop
    // -------------------------------------------------------------------------

    /**
     * Begins a drag operation on a node.
     * @param {Event} evt - The mousedown event.
     * @param {string} nodeId - The ID of the node to drag.
     */
    startDrag: (evt, nodeId) => {
        if (App.AdminEditor.editMode.mode) return; // Don't drag if in an edit mode

        evt.preventDefault();
        App.AdminEditor.isDragging = true;
        App.AdminEditor.draggedNodeId = nodeId;

        const pos = App.AdminEditor.getMousePosition(evt);
        const node = App.mapData.nodes.find(n => n.id === nodeId);
        
        // Store the offset from the node's origin to the mouse pointer
        App.AdminEditor.offset.x = pos.x - node.x;
        App.AdminEditor.offset.y = pos.y - node.y;

        document.body.classList.add('is-dragging');
    },

    /**
     * Handles the mouse-move event during a drag operation, updating the node's position.
     * @param {Event} evt - The mousemove event.
     */
    drag: (evt) => {
        if (!App.AdminEditor.isDragging) return;

        evt.preventDefault();
        const pos = App.AdminEditor.getMousePosition(evt);
        const node = App.mapData.nodes.find(n => n.id === App.AdminEditor.draggedNodeId);

        if (!node) {
            App.AdminEditor.endDrag(); // Node might have been deleted, end drag
            return;
        }

        // Apply offset to keep the node relative to the mouse pointer
        node.x = Math.round(pos.x - App.AdminEditor.offset.x);
        node.y = Math.round(pos.y - App.AdminEditor.offset.y);

        App.Renderer.redrawMapElements();
    },

    /**
     * Ends the drag operation, resetting state.
     */
    endDrag: () => {
        if (!App.AdminEditor.isDragging) return;

        App.AdminEditor.isDragging = false;
        App.AdminEditor.draggedNodeId = null;
        document.body.classList.remove('is-dragging');
    },

    // -------------------------------------------------------------------------
    // State & Helpers
    // -------------------------------------------------------------------------

    /**
     * Sets the active editing mode for the admin panel.
     * @param {object} options - The mode configuration.
     * @param {string|null} options.mode - The mode to activate (e.g., 'add', 'connect').
     * @param {string} [options.type=null] - The node type for 'add' mode.
     * @param {string} [options.access='all'] - The access level for 'add' mode.
     */
    setEditMode: ({ mode, type = null, access = 'all' }) => {
        if (App.AdminEditor.isDragging) {
            App.AdminEditor.endDrag();
        }

        const wasActive = document.querySelector('.admin-add-btn.active');
        // Build a query selector to find the matching button
        let clickedBtnQuery = `.admin-add-btn[data-mode="${mode}"]`;
        if (type) {
            clickedBtnQuery += `[data-type="${type}"]`;
            if (access) {
                clickedBtnQuery += `[data-access="${access}"]`;
            }
        }
        const clickedBtn = document.querySelector(clickedBtnQuery);

        // Deactivate if clicking the same button
        if (wasActive === clickedBtn) {
            App.AdminEditor.editMode = { mode: null, firstNodeId: null };
            if (wasActive) wasActive.classList.remove('active');
        } else {
            // Activate new mode
            App.AdminEditor.editMode = { mode, type, access, firstNodeId: null };
            document.querySelectorAll('.admin-add-btn.active').forEach(b => b.classList.remove('active'));
            if (clickedBtn) clickedBtn.classList.add('active');
        }
        
        App.AdminEditor._updateStatusText();
        App.Renderer.redrawMapElements(); // Redraw to show/hide highlights
    },

    /**
     * Calculates the mouse position relative to the SVG canvas,
     * accounting for zoom and pan.
     * @param {Event} evt - The mouse event.
     * @returns {object} An object { x, y } with the transformed coordinates.
     */
    getMousePosition: (evt) => {
        const CTM = App.DOM.mapSvg.getScreenCTM();
        // CTM.a and CTM.d are scale (zoom)
        // CTM.e and CTM.f are translate (pan)
        return {
            x: (evt.clientX - CTM.e) / CTM.a,
            y: (evt.clientY - CTM.f) / CTM.d
        };
    },

    /**
     * Utility function to get the custom display label for a floor,
     * or a default label if not set.
     * @param {number} floorNum - The floor number.
     * @returns {string} The display label for the floor.
     */
    _getFloorLabel: (floorNum) => {
        return (App.mapData.floorLabels && App.mapData.floorLabels[floorNum])
            ? App.mapData.floorLabels[floorNum]
            : `Floor ${floorNum}`;
    },
    
    /**
     * Generates a default name for a new node based on its type and access.
     * @param {string} type - The node type (e.g., 'room', 'elevator').
     * @param {string} access - The node access (e.g., 'all', 'employee').
     * @returns {string} The generated node name.
     */
    _generateNewNodeName: (type, access) => {
        switch (type) {
            case 'stairs': return 'Stairs';
            case 'hallway': return 'Hallway';
            case 'elevator':
                return (access === 'employee') ? 'Elevator (Emp)' : 'Elevator';
            default:
                // Capitalize the type
                const capitalType = type.charAt(0).toUpperCase() + type.slice(1);
                return `New ${capitalType}`;
        }
    },

    /**
     * Updates the admin status text based on the current edit mode.
     */
    _updateStatusText: () => {
        const { mode, type } = App.AdminEditor.editMode;
        let text = 'Drag nodes to move them or select an action.';
        let cursorStyle = 'default';

        if (mode) {
            switch (mode) {
                case 'add':
                    text = `Click map to add new ${type}.`;
                    cursorStyle = 'crosshair';
                    break;
                case 'connect':
                    text = `Click first node to connect.`;
                    cursorStyle = 'pointer';
                    break;
                case 'disconnect':
                    text = `Click first node to disconnect.`;
                    cursorStyle = 'pointer';
                    break;
                case 'delete-node':
                    text = `Click a node to delete it.`;
                    cursorStyle = 'pointer';
                    break;
                case 'rename-node':
                    text = `Click a room to rename it.`;
                    cursorStyle = 'pointer';
                    break;
            }
        }
        App.DOM.adminStatus.textContent = text;
        App.DOM.mapSvg.style.cursor = cursorStyle;
    },

    // -------------------------------------------------------------------------
    // Refactored handleMapClick Helpers
    // -------------------------------------------------------------------------

    /**
     * (Private) Handles adding a new node to the map.
     * @param {object} pos - The {x, y} position from getMousePosition.
     */
    _handleAddNode: (pos) => {
        const { type, access } = App.AdminEditor.editMode;
        const floor = App.State.currentFloor;

        const nodeName = App.AdminEditor._generateNewNodeName(type, access);
        const newNode = {
            id: `${type.charAt(0).toUpperCase()}-${floor}-${Date.now()}`,
            name: nodeName,
            type: type,
            floor: floor,
            x: Math.round(pos.x),
            y: Math.round(pos.y),
            access: access || 'all'
        };
        App.mapData.nodes.push(newNode);

        // Auto-connect to the nearest node on the same floor
        const nodesOnFloor = App.mapData.nodes.filter(n => n.floor === floor && n.id !== newNode.id);
        if (nodesOnFloor.length > 0) {
            let closestNode = null;
            let minDistance = Infinity;
            nodesOnFloor.forEach(node => {
                const dist = Math.hypot(node.x - newNode.x, node.y - newNode.y);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestNode = node;
                }
            });
            App.mapData.edges.push({ source: newNode.id, target: closestNode.id });
        }

        if (newNode.type === 'room') {
            App.Renderer.populateSelectors();
        }
        App.Renderer.redrawMapElements();
    },

    /**
     * (Private) Handles the two-click process for connecting two nodes.
     * @param {object} targetNode - The node that was clicked.
     */
    _handleConnectNode: (targetNode) => {
        if (!targetNode) return; // Clicked on empty space

        const editMode = App.AdminEditor.editMode;
        const floorLabel = App.AdminEditor._getFloorLabel(targetNode.floor);

        if (!editMode.firstNodeId) {
            // This is the first click
            editMode.firstNodeId = targetNode.id;
            App.DOM.adminStatus.textContent = `Selected ${targetNode.name} on ${floorLabel}. Select second node.`;
        } else {
            // This is the second click
            if (editMode.firstNodeId === targetNode.id) return; // Clicked same node twice

            const firstNode = App.mapData.nodes.find(n => n.id === editMode.firstNodeId);

            // Validate cross-floor connections
            if (firstNode.floor !== targetNode.floor) {
                const isStairs = firstNode.type === 'stairs' && targetNode.type === 'stairs';
                const isElevator = firstNode.type === 'elevator' && targetNode.type === 'elevator';
                if (!isStairs && !isElevator) {
                    App.DOM.adminStatus.textContent = "Error: Cross-floor links must be Stairs-to-Stairs or Elevator-to-Elevator.";
                    // Reset mode after 2 seconds
                    setTimeout(() => App.AdminEditor.setEditMode({ mode: 'connect' }), 2000);
                    return;
                }
            }

            // Add the edge
            App.mapData.edges.push({ source: editMode.firstNodeId, target: targetNode.id });
            App.DOM.adminStatus.textContent = `Connected ${firstNode.name} and ${targetNode.name}!`;
            App.AdminEditor.setEditMode({ mode: 'connect' }); // Reset for next connection
        }
        App.Renderer.redrawMapElements(); // Redraw to show new edge
    },

    /**
     * (Private) Handles the two-click process for disconnecting two nodes.
     * @param {object} targetNode - The node that was clicked.
     */
    _handleDisconnectNode: (targetNode) => {
        if (!targetNode) return; // Clicked on empty space

        const editMode = App.AdminEditor.editMode;

        if (!editMode.firstNodeId) {
            // This is the first click
            editMode.firstNodeId = targetNode.id;
            App.DOM.adminStatus.textContent = `Selected ${targetNode.name}. Click second node to disconnect.`;
        } else {
            // This is the second click
            if (editMode.firstNodeId === targetNode.id) return; // Clicked same node twice

            const firstNodeName = App.mapData.nodes.find(n => n.id === editMode.firstNodeId).name;
            const originalEdgeCount = App.mapData.edges.length;

            // Filter out the edge in either direction
            App.mapData.edges = App.mapData.edges.filter(e =>
                !((e.source === editMode.firstNodeId && e.target === targetNode.id) ||
                  (e.source === targetNode.id && e.target === editMode.firstNodeId))
            );

            if (App.mapData.edges.length < originalEdgeCount) {
                App.DOM.adminStatus.textContent = `Disconnected ${firstNodeName} and ${targetNode.name}.`;
            } else {
                App.DOM.adminStatus.textContent = `No direct connection found.`;
            }
            App.AdminEditor.setEditMode({ mode: 'disconnect' }); // Reset for next
        }
        App.Renderer.redrawMapElements(); // Redraw to remove edge
    },

    /**
     * (Private) Handles deleting a single node (with confirmation).
     * @param {object} targetNode - The node that was clicked.
     */
    _handleDeleteNode: (targetNode) => {
        if (!targetNode) return; // Clicked on empty space

        App.Modal.show(
            `Delete ${targetNode.name}?`,
            'This will permanently remove the node and all its connections.',
            () => {
                // Filter out the node
                App.mapData.nodes = App.mapData.nodes.filter(n => n.id !== targetNode.id);
                // Filter out all edges connected to it
                App.mapData.edges = App.mapData.edges.filter(e => e.source !== targetNode.id && e.target !== targetNode.id);

                if (targetNode.type === 'room') {
                    App.Renderer.populateSelectors(); // Update dropdowns
                }
                App.Renderer.redrawMapElements();
                App.Modal.hide();
                App.AdminEditor.setEditMode({ mode: 'delete-node' }); // Reset mode
            }
        );
    },

    /**
     * (Private) Handles renaming a node (rooms only).
     * @param {object} targetNode - The node that was clicked.
     */
    _handleRenameNode: (targetNode) => {
        if (!targetNode) return; // Clicked on empty space

        // Validation: Only allow renaming rooms
        if (targetNode.type !== 'room') {
            App.DOM.adminStatus.textContent = 'Only rooms can be renamed.';
            return;
        }

        const newName = prompt(`Enter new name for "${targetNode.name}":`, targetNode.name);

        if (newName && newName.trim() !== '') {
            targetNode.name = newName.trim();
            App.DOM.adminStatus.textContent = `Renamed node to "${targetNode.name}".`;
            App.Renderer.redrawMapElements();
            App.Renderer.populateSelectors(); // Update dropdowns with new name
        }
        App.AdminEditor.setEditMode({ mode: 'rename-node' }); // Reset mode
    }
};
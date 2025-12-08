window.App = window.App || {};

App.AdminEditor = {
    gridSize: 5,
    draggedNodeId: null,
    shiftPressed: false,
    isDragging: false,
    offset: { x: 0, y: 0 },

    defaultShortcuts: {
        'add-room': 'r', 'add-hallway': 'h', 'add-stairs': 's',
        'add-elevator-public': 'u', 'add-elevator-staff': 'i',
        'connect': 'c', 'disconnect': 'x', 'delete': 'd',
        'draw-path': 'p', 'rename': 'n', 'save': 'k', 'cancel': 'escape'
    },

    shortcuts: {},

    viewState: {
        scale: 1, panX: 0, panY: 0, isPanning: false, startX: 0, startY: 0
    },

    editMode: {
        mode: null, type: null, access: null, firstNodeId: null, lastAddedNodeId: null
    },

    adminDOMElements: {
        adminPanel: document.getElementById('adminPanel'),
        adminStatus: document.getElementById('adminStatus'),
        zoomSlider: document.getElementById('zoomSlider'),
        resetZoomBtn: document.getElementById('resetZoomBtn'),
        mapSvg: document.getElementById('mapSvg'),
        saveBtn: document.getElementById('saveToDbBtn'),
        uploadForm: document.getElementById('uploadForm'),
        floorImageInput: document.getElementById('floorImageInput'),
        btnOpenSettings: document.getElementById('btn-open-settings'),
        shortcutModal: document.getElementById('shortcutModal'),
        shortcutList: document.getElementById('shortcutList'),
        btnCloseSettings: document.getElementById('btnCloseSettings'),
        btnSaveShortcuts: document.getElementById('btnSaveShortcuts'),
        btnResetShortcuts: document.getElementById('btnResetShortcuts')
    },

    init: () => {
        App.AdminEditor.loadShortcuts();
        App.AdminEditor.updateTooltips();

        const mapSvg = document.getElementById('mapSvg');
        
        mapSvg.addEventListener('click', App.AdminEditor.handleMapClick);
        mapSvg.addEventListener('mousedown', App.AdminEditor.handleMouseDown);
        window.addEventListener('mousemove', App.AdminEditor.handleMouseMove); 
        window.addEventListener('mouseup', App.AdminEditor.handleMouseUp);

        mapSvg.addEventListener('wheel', (e) => {
            e.preventDefault();
            const direction = e.deltaY > 0 ? -0.1 : 0.1;
            let newScale = App.AdminEditor.viewState.scale + direction;
            newScale = Math.min(Math.max(0.5, newScale), 3);
            App.AdminEditor.viewState.scale = newScale;
            if(App.AdminEditor.adminDOMElements.zoomSlider) 
                App.AdminEditor.adminDOMElements.zoomSlider.value = newScale;
            App.AdminEditor._updateMapTransform();
        });

        document.querySelectorAll('.admin-tool-btn').forEach(btn => 
            btn.addEventListener('click', App.AdminEditor.handleToolClick));
        document.querySelectorAll('.admin-add-btn').forEach(btn => 
            btn.addEventListener('click', App.AdminEditor.handleAddClick));

        document.getElementById('addFloorBtn')?.addEventListener('click', App.AdminEditor.handleAddNewFloor);
        document.getElementById('deleteFloorBtn')?.addEventListener('click', App.AdminEditor.handleDeleteFloor);
        document.getElementById('setFloorLabelBtn')?.addEventListener('click', App.AdminEditor.handleSetFloorLabel);
        
        document.getElementById('saveToDbBtn')?.addEventListener('click', App.AdminEditor.handleSaveMapToDatabase);
        document.getElementById('exportMapBtn')?.addEventListener('click', App.AdminEditor.handleExportMapData);
        document.getElementById('importMapInput')?.addEventListener('change', App.AdminEditor.handleImportMapData);
        document.getElementById('uploadForm')?.addEventListener('submit', App.AdminEditor.handleUploadFloorImage);

        const els = App.AdminEditor.adminDOMElements;
        if (els.btnOpenSettings) els.btnOpenSettings.addEventListener('click', App.AdminEditor.openSettings);
        if (els.btnCloseSettings) els.btnCloseSettings.addEventListener('click', App.AdminEditor.closeSettings);
        if (els.btnSaveShortcuts) els.btnSaveShortcuts.addEventListener('click', App.AdminEditor.closeSettings);
        if (els.btnResetShortcuts) els.btnResetShortcuts.addEventListener('click', App.AdminEditor.resetShortcuts);

        window.addEventListener('keydown', App.AdminEditor.handleKeyDown);
        window.addEventListener('keyup', App.AdminEditor.handleKeyUp);

        if (els.zoomSlider) els.zoomSlider.addEventListener('input', App.AdminEditor.handleZoom);
        if (els.resetZoomBtn) els.resetZoomBtn.addEventListener('click', App.AdminEditor.handleResetZoom);
    },

    shutdown: () => {
        window.removeEventListener('keydown', App.AdminEditor.handleKeyDown);
        window.removeEventListener('keyup', App.AdminEditor.handleKeyUp);
        window.removeEventListener('mousemove', App.AdminEditor.handleMouseMove);
        window.removeEventListener('mouseup', App.AdminEditor.handleMouseUp);
        const mapSvg = document.getElementById('mapSvg');
        if(mapSvg) {
            mapSvg.removeEventListener('click', App.AdminEditor.handleMapClick);
            mapSvg.removeEventListener('mousedown', App.AdminEditor.handleMouseDown);
        }
        App.AdminEditor.setEditMode(null);
    },

    loadShortcuts: () => {
        const stored = localStorage.getItem('bravo_shortcuts');
        App.AdminEditor.shortcuts = stored ? JSON.parse(stored) : { ...App.AdminEditor.defaultShortcuts };
    },

    updateTooltips: () => {
        const keys = App.AdminEditor.shortcuts;
        const setHint = (selector, label, keyName) => {
            const el = document.querySelector(selector);
            if (el && keys[keyName]) el.title = `${label} [${keys[keyName].toUpperCase()}]`;
        };

        setHint('#btn-draw-path', 'Draw Path', 'draw-path');
        setHint('#btn-add-room', 'Add Room', 'add-room');
        setHint('#btn-add-hallway', 'Add Hallway', 'add-hallway');
        setHint('#btn-add-stairs', 'Add Stairs', 'add-stairs');
        setHint('button[data-type="elevator"][data-access="all"]', 'Public Elevator', 'add-elevator-public');
        setHint('button[data-type="elevator"][data-access="employee"]', 'Staff Elevator', 'add-elevator-staff');
        setHint('#btn-connect', 'Connect', 'connect');
        setHint('#btn-disconnect', 'Disconnect', 'disconnect');
        setHint('button[data-mode="rename-node"]', 'Rename', 'rename');
        setHint('#btn-delete-node', 'Delete', 'delete');
        setHint('#saveToDbBtn', 'Save to DB', 'save');
    },

    resetShortcuts: () => {
        if(!confirm("Reset all shortcuts?")) return;
        App.AdminEditor.shortcuts = { ...App.AdminEditor.defaultShortcuts };
        localStorage.removeItem('bravo_shortcuts');
        App.AdminEditor.renderSettingsModal(); 
        App.AdminEditor.updateTooltips();
    },

    openSettings: () => {
        App.AdminEditor.renderSettingsModal();
        App.AdminEditor.adminDOMElements.shortcutModal.style.display = 'flex';
    },

    closeSettings: () => {
        App.AdminEditor.adminDOMElements.shortcutModal.style.display = 'none';
        App.AdminEditor.updateTooltips();
    },

    renderSettingsModal: () => {
        const list = App.AdminEditor.adminDOMElements.shortcutList;
        list.innerHTML = '';
        const labels = {
            'add-room': 'Add Room', 'add-hallway': 'Add Hallway', 'add-stairs': 'Add Stairs',
            'add-elevator-public': 'Add Public Elevator', 'add-elevator-staff': 'Add Staff Elevator',
            'connect': 'Connect Nodes', 'disconnect': 'Disconnect', 'delete': 'Delete Node',
            'draw-path': 'Draw Path', 'rename': 'Rename Node', 'save': 'Save Map', 'cancel': 'Cancel'
        };

        Object.entries(App.AdminEditor.shortcuts).forEach(([action, key]) => {
            const row = document.createElement('div');
            row.className = 'shortcut-row';
            row.innerHTML = `<span class="text-sm text-gray-300 font-medium">${labels[action] || action}</span><button class="shortcut-key-btn" data-action="${action}">${key.toUpperCase()}</button>`;
            row.querySelector('button').addEventListener('click', (e) => App.AdminEditor.startRecordingKey(e.target, action));
            list.appendChild(row);
        });
    },

    startRecordingKey: (btnElement, action) => {
        const originalText = btnElement.textContent;
        btnElement.textContent = "Press key...";
        btnElement.classList.add('recording');

        const recordHandler = (e) => {
            e.preventDefault(); e.stopPropagation();
            if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
            let newKey = e.key.toLowerCase();
            if (newKey === ' ') newKey = 'space';

            App.AdminEditor.shortcuts[action] = newKey;
            localStorage.setItem('bravo_shortcuts', JSON.stringify(App.AdminEditor.shortcuts));
            btnElement.textContent = newKey.toUpperCase();
            btnElement.classList.remove('recording');
            window.removeEventListener('keydown', recordHandler);
        };

        window.addEventListener('keydown', recordHandler);
        const cancelHandler = () => {
            btnElement.textContent = originalText;
            btnElement.classList.remove('recording');
            window.removeEventListener('keydown', recordHandler);
            document.removeEventListener('click', cancelHandler);
        };
        setTimeout(() => document.addEventListener('click', cancelHandler, {once:true}), 100);
    },

    handleToolClick: (e) => {
        const mode = e.currentTarget.dataset.mode;
        App.AdminEditor.setEditMode(App.AdminEditor.editMode.mode === mode ? null : mode);
    },

    handleAddClick: (e) => {
        const { mode, type, access } = e.currentTarget.dataset;
        const current = App.AdminEditor.editMode;
        if (current.mode === mode && current.type === type) App.AdminEditor.setEditMode(null);
        else App.AdminEditor.setEditMode(mode, type, access || 'all');
    },

    handleKeyDown: (e) => {
        if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
        if (e.key === 'Shift') App.AdminEditor.shiftPressed = true;
        
        const key = e.key.toLowerCase();
        const map = App.AdminEditor.shortcuts;

        if (key === map['add-room']) document.getElementById('btn-add-room')?.click();
        if (key === map['add-hallway']) document.getElementById('btn-add-hallway')?.click();
        if (key === map['add-stairs']) document.getElementById('btn-add-stairs')?.click();
        
        if (key === map['add-elevator-public']) 
            (document.querySelector('button[data-type="elevator"][data-access="all"]') || {click:()=>{App.AdminEditor.setEditMode('add','elevator','all')}}).click();
        if (key === map['add-elevator-staff']) 
            (document.querySelector('button[data-type="elevator"][data-access="employee"]') || {click:()=>{App.AdminEditor.setEditMode('add','elevator','employee')}}).click();

        if (key === map['connect']) document.getElementById('btn-connect')?.click();
        if (key === map['disconnect']) document.getElementById('btn-disconnect')?.click();
        if (key === map['delete']) document.getElementById('btn-delete-node')?.click();
        if (key === map['draw-path']) document.getElementById('btn-draw-path')?.click();
        
        if (key === map['rename']) 
            (document.querySelector('button[data-mode="rename-node"]') || {click:()=>{App.AdminEditor.setEditMode('rename-node')}}).click();

        if (key === map['save']) { e.preventDefault(); App.AdminEditor.handleSaveMapToDatabase(); }
        if (key === map['cancel']) App.AdminEditor.setEditMode(null);
    },

    handleKeyUp: (e) => {
        if (e.key === 'Shift') App.AdminEditor.shiftPressed = false;
    },

    handleZoom: (e) => {
        App.AdminEditor.viewState.scale = parseFloat(e.target.value);
        App.AdminEditor._updateMapTransform();
    },

    handleResetZoom: () => {
        App.AdminEditor.viewState = { ...App.AdminEditor.viewState, scale: 1, panX: 0, panY: 0 };
        if(App.AdminEditor.adminDOMElements.zoomSlider) App.AdminEditor.adminDOMElements.zoomSlider.value = 1;
        App.AdminEditor._updateMapTransform();
    },

    _updateMapTransform: () => {
        const { scale, panX, panY } = App.AdminEditor.viewState;
        const svg = document.getElementById('mapSvg');
        if (svg) {
            svg.style.transformOrigin = "0 0"; 
            svg.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
        }
    },

    handleMouseDown: (evt) => {
        const target = evt.target;
        const nodeGroup = target.closest('.node-group') || target.closest('g[id^="g-"]');
        
        if (nodeGroup && !App.AdminEditor.editMode.mode) {
            const nodeId = nodeGroup.dataset.nodeId || target.id;
            if (nodeId) {
                App.AdminEditor.startDrag(evt, nodeId);
                return;
            }
        }

        if (!nodeGroup && !App.AdminEditor.editMode.mode) {
            App.AdminEditor.viewState.isPanning = true;
            App.AdminEditor.viewState.startX = evt.clientX - App.AdminEditor.viewState.panX;
            App.AdminEditor.viewState.startY = evt.clientY - App.AdminEditor.viewState.panY;
            document.body.style.cursor = 'grabbing';
        }
    },

    handleMouseMove: (evt) => {
        if (App.AdminEditor.isDragging && App.AdminEditor.draggedNodeId) {
            evt.preventDefault();
            if (App.AdminEditor.dragAnimationFrame) cancelAnimationFrame(App.AdminEditor.dragAnimationFrame);

            App.AdminEditor.dragAnimationFrame = requestAnimationFrame(() => {
                const pos = App.AdminEditor.getMousePosition(evt);
                const node = App.mapData.nodes.find(n => n.id === App.AdminEditor.draggedNodeId);
                if (!node) { App.AdminEditor.endDrag(); return; }

                let rawX = pos.x - App.AdminEditor.offset.x;
                let rawY = pos.y - App.AdminEditor.offset.y;

                const gs = App.AdminEditor.gridSize;
                node.x = App.AdminEditor.shiftPressed ? Math.round(rawX) : Math.round(rawX / gs) * gs;
                node.y = App.AdminEditor.shiftPressed ? Math.round(rawY) : Math.round(rawY / gs) * gs;

                App.Renderer.redrawMapElements();
            });
            return;
        }

        if (App.AdminEditor.viewState.isPanning) {
            evt.preventDefault();
            App.AdminEditor.viewState.panX = evt.clientX - App.AdminEditor.viewState.startX;
            App.AdminEditor.viewState.panY = evt.clientY - App.AdminEditor.viewState.startY;
            App.AdminEditor._updateMapTransform();
        }
    },

    handleMouseUp: () => {
        if (App.AdminEditor.viewState.isPanning) {
            App.AdminEditor.viewState.isPanning = false;
            document.body.style.cursor = '';
        }
        App.AdminEditor.endDrag();
    },

    startDrag: (evt, nodeId) => {
        evt.preventDefault();
        App.AdminEditor.isDragging = true;
        App.AdminEditor.draggedNodeId = nodeId;

        const pos = App.AdminEditor.getMousePosition(evt);
        const node = App.mapData.nodes.find(n => n.id === nodeId);
        
        App.AdminEditor.offset.x = pos.x - node.x;
        App.AdminEditor.offset.y = pos.y - node.y;

        document.body.classList.add('is-dragging');
    },

    endDrag: () => {
        if (App.AdminEditor.isDragging) {
            if (App.AdminEditor.dragAnimationFrame) cancelAnimationFrame(App.AdminEditor.dragAnimationFrame);
            App.AdminEditor.isDragging = false;
            App.AdminEditor.draggedNodeId = null;
            document.body.classList.remove('is-dragging');
            App.Utils.buildGraphMap();
        }
    },

    getMousePosition: (evt) => {
        const svg = document.getElementById('mapSvg');
        const CTM = svg.getScreenCTM();
        if (!CTM) return { x: 0, y: 0 };
        return { x: (evt.clientX - CTM.e) / CTM.a, y: (evt.clientY - CTM.f) / CTM.d };
    },

    setEditMode: (mode, type = null, access = 'all') => {
        App.AdminEditor.editMode = { mode, type, access, firstNodeId: null, lastAddedNodeId: null };
        const status = document.getElementById('adminStatus');
        if (status) status.textContent = mode ? `Mode: ${mode.toUpperCase()} ${type ? `(${type})` : ''}` : 'Drag nodes or Pan map.';

        document.querySelectorAll('.admin-add-btn').forEach(btn => btn.classList.remove('ring-2', 'ring-offset-2', 'ring-indigo-500'));

        if (mode) {
            let s = `button[data-mode="${mode}"]`;
            if (type) s += `[data-type="${type}"]`;
            if (access && type === 'elevator') s += `[data-access="${access}"]`;
            document.querySelector(s)?.classList.add('ring-2', 'ring-offset-2', 'ring-indigo-500');
        }
    },

    handleMapClick: (evt) => {
        const target = evt.target;
        const { mode } = App.AdminEditor.editMode;
        
        if (target.classList.contains('admin-edge-hitbox')) {
            App.AdminEditor.handleEdgeClick(evt, { id: target.dataset.edgeId, source: target.dataset.edgeSource, target: target.dataset.edgeTarget });
            return;
        }

        const nodeGroup = target.closest('.node-group') || target.closest('g[id^="g-"]');
        const targetNode = nodeGroup ? App.mapData.nodes.find(n => n.id === (nodeGroup.dataset.nodeId || target.id)) : null;

        if (!mode) return;
        const pos = App.AdminEditor.getMousePosition(evt);

        if (mode === 'add' && !targetNode) App.AdminEditor._handleAddNode(pos);
        else if (mode === 'draw-path') {
            if (targetNode) {
                App.AdminEditor.editMode.lastAddedNodeId = targetNode.id;
            } else {
                const newNodeId = App.AdminEditor._handleAddNode(pos, true); 
                const prevId = App.AdminEditor.editMode.lastAddedNodeId;
                if (prevId && prevId !== newNodeId) {
                    const exists = App.mapData.edges.some(e => (e.source === prevId && e.target === newNodeId) || (e.source === newNodeId && e.target === prevId));
                    if(!exists) App.mapData.edges.push({ source: prevId, target: newNodeId });
                }
                App.Utils.buildGraphMap();
                App.AdminEditor.editMode.lastAddedNodeId = newNodeId;
                App.Renderer.redrawMapElements();
            }
        }
        else if (mode === 'connect' && targetNode) App.AdminEditor._handleConnectNodes(targetNode.id);
        else if (mode === 'disconnect' && targetNode) App.AdminEditor._handleDisconnectNode(targetNode);
        else if (mode === 'delete-node' && targetNode) App.AdminEditor._handleDeleteNode(targetNode.id);
        else if (mode === 'rename-node' && targetNode) App.AdminEditor._handleRenameNode(targetNode);
    },

    _handleAddNode: (pos, suppressRedraw = false) => {
        const { type, access } = App.AdminEditor.editMode;
        const floor = App.State.currentFloor, gs = App.AdminEditor.gridSize;
        
        const newNode = {
            id: `${type.charAt(0).toUpperCase()}-${floor}-${Date.now()}`,
            name: App.AdminEditor._generateNewNodeName(type),
            type, floor, access: access || 'all',
            x: Math.round(pos.x / gs) * gs, y: Math.round(pos.y / gs) * gs
        };

        App.mapData.nodes.push(newNode);

        if (App.AdminEditor.editMode.mode !== 'draw-path') {
            const closest = App.mapData.nodes
                .filter(n => n.floor === floor && n.id !== newNode.id)
                .map(n => ({ id: n.id, dist: Math.hypot(n.x - newNode.x, n.y - newNode.y) }))
                .sort((a, b) => a.dist - b.dist)[0];
            
            if (closest && closest.dist < 60) App.mapData.edges.push({ source: closest.id, target: newNode.id });
        }

        if (newNode.type === 'room') App.Renderer.populateSelectors();
        
        if (!suppressRedraw) {
            App.Renderer.redrawMapElements();
            App.Utils.buildGraphMap();
        }
        return newNode.id; 
    },

    handleEdgeClick: (evt, edge) => {
        if (!App.AdminEditor.editMode.mode) {
             const pos = App.AdminEditor.getMousePosition(evt);
             const gs = App.AdminEditor.gridSize;
             const newNode = {
                id: `H-${App.State.currentFloor}-${Date.now()}`,
                name: "Hallway", type: "hallway", floor: App.State.currentFloor, access: "all",
                x: Math.round(pos.x / gs) * gs, y: Math.round(pos.y / gs) * gs
            };
            App.mapData.nodes.push(newNode);
            App.mapData.edges = App.mapData.edges.filter(e => 
                !((e.source === edge.source && e.target === edge.target) || (e.source === edge.target && e.target === edge.source))
            );
            App.mapData.edges.push({ source: edge.source, target: newNode.id }, { source: newNode.id, target: edge.target });
            App.Utils.buildGraphMap();
            App.Renderer.redrawMapElements();
            App.AdminEditor.startDrag(evt, newNode.id);
        }
    },

    _handleConnectNodes: (nodeId) => {
        if (!App.AdminEditor.editMode.firstNodeId) App.AdminEditor.editMode.firstNodeId = nodeId;
        else {
            if (App.AdminEditor.editMode.firstNodeId !== nodeId) {
                App.mapData.edges.push({ source: App.AdminEditor.editMode.firstNodeId, target: nodeId });
                App.Utils.buildGraphMap();
                App.Renderer.redrawMapElements();
            }
            App.AdminEditor.editMode.firstNodeId = null;
        }
    },

    _handleDisconnectNode: (targetNode) => {
        if (!App.AdminEditor.editMode.firstNodeId) App.AdminEditor.editMode.firstNodeId = targetNode.id;
        else {
            const firstId = App.AdminEditor.editMode.firstNodeId;
            App.mapData.edges = App.mapData.edges.filter(e => !((e.source === firstId && e.target === targetNode.id) || (e.source === targetNode.id && e.target === firstId)));
            App.AdminEditor.editMode.firstNodeId = null;
            App.Utils.buildGraphMap();
            App.Renderer.redrawMapElements();
        }
    },

    _handleDeleteNode: (nodeId) => {
        if (!confirm('Delete node?')) return;
        App.mapData.nodes = App.mapData.nodes.filter(n => n.id !== nodeId);
        App.mapData.edges = App.mapData.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
        App.Utils.buildGraphMap();
        App.Renderer.redrawMapElements();
        App.Renderer.populateSelectors();
    },

    _handleRenameNode: (targetNode) => {
        const newName = prompt("Rename:", targetNode.name);
        if (newName) {
            targetNode.name = newName;
            App.Renderer.redrawMapElements();
            App.Renderer.populateSelectors();
        }
    },

    _generateNewNodeName: (type) => `${type}-${Date.now().toString().slice(-4)}`,

    handleSaveMapToDatabase: () => {
        const btn = document.getElementById('saveToDbBtn');
        const original = btn.textContent;
        btn.textContent = "Saving...";
        fetch('server-user/saveMapData.php', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(App.mapData)
        }).then(r => r.json()).then(d => {
            alert(d.success ? "Saved!" : "Error: " + d.message);
            btn.textContent = original;
        }).catch(err => { console.error(err); btn.textContent = original; });
    },

    handleAddNewFloor: () => {
        const existing = new Set(App.mapData.nodes.map(n => n.floor));
        const newFloor = existing.size ? Math.max(...existing) + 1 : 1;
        App.mapData.nodes.push({ id:`H-${newFloor}-START`, name:'Hallway', type:'hallway', floor: newFloor, x:100, y:100, access:'all'});
        if(!App.mapData.floorLabels) App.mapData.floorLabels = {};
        App.mapData.floorLabels[newFloor] = `Floor ${newFloor}`;
        App.Renderer.updateFloorButtons();
        App.Renderer.switchFloor(newFloor);
    },
    
    handleDeleteFloor: () => {
        if(!confirm("Delete current floor?")) return;
        const f = App.State.currentFloor;
        App.mapData.nodes = App.mapData.nodes.filter(n => n.floor !== f);
        if(App.mapData.floorPlans) delete App.mapData.floorPlans[f];
        if(App.mapData.floorLabels) delete App.mapData.floorLabels[f];
        App.Renderer.updateFloorButtons();
        App.Renderer.switchFloor(1);
    },

    handleSetFloorLabel: () => {
        const l = prompt("Label:", App.mapData.floorLabels?.[App.State.currentFloor] || "");
        if(l) {
            if(!App.mapData.floorLabels) App.mapData.floorLabels = {};
            App.mapData.floorLabels[App.State.currentFloor] = l;
            App.Renderer.updateFloorButtons();
        }
    },

    handleExportMapData: () => {
        const a = document.createElement('a');
        a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(App.mapData));
        a.download = "map.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    },

    handleImportMapData: (e) => {
        const r = new FileReader();
        r.onload = (ev) => {
            try {
                const d = JSON.parse(ev.target.result);
                if(d.nodes && d.edges) {
                    App.mapData = d;
                    App.Utils.buildGraphMap();
                    App.Renderer.redrawMapElements();
                    App.Renderer.updateFloorButtons();
                    App.Renderer.populateSelectors();
                    alert("Imported!");
                }
            } catch(x){ alert("Invalid JSON"); }
        };
        r.readAsText(e.target.files[0]);
    },

    handleUploadFloorImage: async (e) => {
        e.preventDefault();
        const f = document.getElementById('floorImageInput').files[0];
        if(!f) return;
        const fd = new FormData();
        fd.append('floorImage', f);
        fd.append('floorNumber', App.State.currentFloor);
        await fetch('server-user/uploadFloorPlan.php', { method:'POST', body:fd });
        location.reload();
    }
};
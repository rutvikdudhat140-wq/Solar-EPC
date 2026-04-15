// Advanced Solar Design Studio   Zustand Store with Full Manual Control
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Utility functions
const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const isPointInPolygon = (point, polygon) => {
    const [x, y] = point;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    return inside;
};

const snapToGrid = (value, gridSize) => Math.round(value / gridSize) * gridSize;

export const useSolarStore = create(
    subscribeWithSelector((set, get) => ({
        //    Core State                                                             
        roofs: [],
        selectedRoofId: null,
        editingRoofId: null,

        panels: [],
        selectedPanelIds: [],
        draggedPanels: [],

        obstacles: [],
        selectedObstacleIds: [],

        //    UI State                                                               
        activeTool: 'select', // 'select' | 'drawRoof' | 'editRoof' | 'addPanel' | 'autofill' | 'delete'
        viewMode: '2d', // '2d' | '3d'
        isDrawing: false,
        isEditing: false,
        isDragging: false,

        //    Panel Settings                                                        
        panelSettings: {
            width: 2.0,          // meters
            height: 1.0,         // meters
            power: 400,          // watts
            tilt: 20,            // degrees
            azimuth: 180,        // degrees (south = 180)
            spacing: 0.05,       // meters between panels
            rowSpacing: 1.5,     // meters between rows
            orientation: 'landscape', // 'landscape' | 'portrait'
            snapToGrid: true,
            gridSize: 0.1,       // meters
        },

        //    Roof Settings                                                         
        roofSettings: {
            height: 3.0,         // meters above ground
            color: '#2a2a3a',
            selectedColor: '#1e3a5f',
        },

        //    Solar Analysis                                                        
        solarAnalysis: {
            totalPanels: 0,
            totalDCCapacity: 0,  // kW
            estimatedGeneration: 0, // kWh/year
            shadedPanels: [],
            efficiency: 0.85,    // system efficiency
            irradiance: 1800,    // kWh/m /year
        },

        //    Sun Simulation                                                        
        sunSimulation: {
            enabled: false,
            hour: 12,            // 0-24
            day: 172,            // day of year (June 21st = 172)
            latitude: 28.6,      // degrees
            longitude: 77.2,     // degrees
            timezone: 5.5,       // UTC offset
        },

        //    History (Undo/Redo)                                                   
        history: {
            states: [],
            currentIndex: -1,
            maxSize: 50,
        },

        //    View Settings                                                         
        viewSettings: {
            showGrid: true,
            showShadows: true,
            showLabels: true,
            cameraPosition: [0, 50, 50],
            mapCenter: { lat: 28.6139, lng: 77.2090 },
            mapZoom: 20,
        },

        //    History Actions                                                       
        saveStateToHistory: () => {
            const state = get();
            const currentState = {
                roofs: JSON.parse(JSON.stringify(state.roofs)),
                panels: JSON.parse(JSON.stringify(state.panels)),
                obstacles: JSON.parse(JSON.stringify(state.obstacles)),
                timestamp: Date.now(),
            };

            const newStates = [...state.history.states.slice(0, state.history.currentIndex + 1), currentState];
            if (newStates.length > state.history.maxSize) {
                newStates.shift();
            }

            set({
                history: {
                    ...state.history,
                    states: newStates,
                    currentIndex: newStates.length - 1,
                }
            });
        },

        undo: () => {
            const state = get();
            if (state.history.currentIndex > 0) {
                const prevState = state.history.states[state.history.currentIndex - 1];
                set({
                    roofs: prevState.roofs,
                    panels: prevState.panels,
                    obstacles: prevState.obstacles,
                    history: {
                        ...state.history,
                        currentIndex: state.history.currentIndex - 1,
                    }
                });
                get().recalculateSolarAnalysis();
            }
        },

        redo: () => {
            const state = get();
            if (state.history.currentIndex < state.history.states.length - 1) {
                const nextState = state.history.states[state.history.currentIndex + 1];
                set({
                    roofs: nextState.roofs,
                    panels: nextState.panels,
                    obstacles: nextState.obstacles,
                    history: {
                        ...state.history,
                        currentIndex: state.history.currentIndex + 1,
                    }
                });
                get().recalculateSolarAnalysis();
            }
        },

        canUndo: () => get().history.currentIndex > 0,
        canRedo: () => get().history.currentIndex < get().history.states.length - 1,

        //    Roof Actions                                                           
        addRoof: (roofData) => {
            get().saveStateToHistory();
            const roof = {
                id: generateId(),
                type: 'polygon',
                points: roofData.points || [],
                bounds: roofData.bounds || { minX: 0, minY: 0, maxX: 10, maxY: 10 },
                height: roofData.height || get().roofSettings.height,
                color: get().roofSettings.color,
                label: roofData.label || `Roof ${get().roofs.length + 1}`,
                area: roofData.area || 0,
                createdAt: Date.now(),
                ...roofData,
            };

            set(state => ({
                roofs: [...state.roofs, roof],
                selectedRoofId: roof.id,
            }));
        },

        updateRoof: (roofId, updates) => {
            set(state => ({
                roofs: state.roofs.map(roof =>
                    roof.id === roofId ? { ...roof, ...updates } : roof
                )
            }));
        },

        deleteRoof: (roofId) => {
            get().saveStateToHistory();
            set(state => ({
                roofs: state.roofs.filter(roof => roof.id !== roofId),
                panels: state.panels.filter(panel => panel.roofId !== roofId),
                selectedRoofId: state.selectedRoofId === roofId ? null : state.selectedRoofId,
            }));
            get().recalculateSolarAnalysis();
        },

        setSelectedRoof: (roofId) => set({ selectedRoofId: roofId }),

        startEditingRoof: (roofId) => set({ editingRoofId: roofId, activeTool: 'editRoof' }),

        stopEditingRoof: () => set({ editingRoofId: null, activeTool: 'select' }),

        //    Panel Actions                                                          
        addPanel: (panelData) => {
            get().saveStateToHistory();
            const settings = get().panelSettings;

            let position = panelData.position || { x: 0, y: 0, z: 0 };

            if (settings.snapToGrid) {
                position.x = snapToGrid(position.x, settings.gridSize);
                position.z = snapToGrid(position.z, settings.gridSize);
            }

            const panel = {
                id: generateId(),
                roofId: panelData.roofId || get().selectedRoofId,
                position,
                rotation: panelData.rotation || { x: settings.tilt, y: settings.azimuth, z: 0 },
                size: {
                    width: settings.orientation === 'landscape' ? settings.width : settings.height,
                    height: settings.orientation === 'landscape' ? settings.height : settings.width
                },
                power: settings.power,
                efficiency: panelData.efficiency || 0.85,
                shaded: false,
                selected: false,
                createdAt: Date.now(),
                ...panelData,
            };

            set(state => ({
                panels: [...state.panels, panel]
            }));

            get().recalculateSolarAnalysis();
        },

        updatePanel: (panelId, updates) => {
            const settings = get().panelSettings;

            if (updates.position && settings.snapToGrid) {
                updates.position.x = snapToGrid(updates.position.x, settings.gridSize);
                updates.position.z = snapToGrid(updates.position.z, settings.gridSize);
            }

            set(state => ({
                panels: state.panels.map(panel =>
                    panel.id === panelId ? { ...panel, ...updates } : panel
                )
            }));

            get().recalculateSolarAnalysis();
        },

        deletePanel: (panelId) => {
            get().saveStateToHistory();
            set(state => ({
                panels: state.panels.filter(panel => panel.id !== panelId),
                selectedPanelIds: state.selectedPanelIds.filter(id => id !== panelId),
            }));
            get().recalculateSolarAnalysis();
        },

        deletePanels: (panelIds) => {
            get().saveStateToHistory();
            set(state => ({
                panels: state.panels.filter(panel => !panelIds.includes(panel.id)),
                selectedPanelIds: state.selectedPanelIds.filter(id => !panelIds.includes(id)),
            }));
            get().recalculateSolarAnalysis();
        },

        duplicatePanel: (panelId) => {
            const state = get();
            const panel = state.panels.find(p => p.id === panelId);
            if (panel) {
                const newPanel = {
                    ...panel,
                    id: generateId(),
                    position: {
                        ...panel.position,
                        x: panel.position.x + panel.size.width + state.panelSettings.spacing,
                    }
                };
                get().addPanel(newPanel);
            }
        },

        selectPanels: (panelIds, addToSelection = false) => {
            set(state => ({
                selectedPanelIds: addToSelection
                    ? [...new Set([...state.selectedPanelIds, ...panelIds])]
                    : panelIds
            }));
        },

        clearPanelSelection: () => set({ selectedPanelIds: [] }),

        movePanels: (panelIds, deltaPosition) => {
            const settings = get().panelSettings;

            panelIds.forEach(panelId => {
                const panel = get().panels.find(p => p.id === panelId);
                if (panel) {
                    let newPosition = {
                        x: panel.position.x + deltaPosition.x,
                        y: panel.position.y + (deltaPosition.y || 0),
                        z: panel.position.z + deltaPosition.z,
                    };

                    if (settings.snapToGrid) {
                        newPosition.x = snapToGrid(newPosition.x, settings.gridSize);
                        newPosition.z = snapToGrid(newPosition.z, settings.gridSize);
                    }

                    get().updatePanel(panelId, { position: newPosition });
                }
            });
        },

        rotatePanels: (panelIds, deltaRotation) => {
            get().saveStateToHistory();

            panelIds.forEach(panelId => {
                const panel = get().panels.find(p => p.id === panelId);
                if (panel) {
                    const newRotation = {
                        x: panel.rotation.x + (deltaRotation.x || 0),
                        y: panel.rotation.y + (deltaRotation.y || 0),
                        z: panel.rotation.z + (deltaRotation.z || 0),
                    };

                    get().updatePanel(panelId, { rotation: newRotation });
                }
            });
        },

        resizePanels: (panelIds, newSize) => {
            get().saveStateToHistory();

            panelIds.forEach(panelId => {
                get().updatePanel(panelId, { size: newSize });
            });
        },

        //    Auto-Fill Panels                                                       
        autoFillPanels: (roofId) => {
            get().saveStateToHistory();
            const state = get();
            const roof = state.roofs.find(r => r.id === roofId);

            if (!roof || !roof.points || roof.points.length < 3) {
                return;
            }

            const settings = state.panelSettings;
            const panelWidth = settings.orientation === 'landscape' ? settings.width : settings.height;
            const panelHeight = settings.orientation === 'landscape' ? settings.height : settings.width;

            // Calculate bounding box
            const bounds = roof.bounds || {
                minX: Math.min(...roof.points.map(p => p[0])),
                maxX: Math.max(...roof.points.map(p => p[0])),
                minY: Math.min(...roof.points.map(p => p[1])),
                maxY: Math.max(...roof.points.map(p => p[1])),
            };

            const newPanels = [];
            let y = bounds.minY + panelHeight / 2;

            while (y < bounds.maxY - panelHeight / 2) {
                let x = bounds.minX + panelWidth / 2;

                while (x < bounds.maxX - panelWidth / 2) {
                    // Check if panel center is inside roof polygon
                    const panelCenter = [x, y];

                    if (isPointInPolygon(panelCenter, roof.points)) {
                        // Check if panel corners are also inside (optional, more strict)
                        const corners = [
                            [x - panelWidth / 2, y - panelHeight / 2],
                            [x + panelWidth / 2, y - panelHeight / 2],
                            [x + panelWidth / 2, y + panelHeight / 2],
                            [x - panelWidth / 2, y + panelHeight / 2],
                        ];

                        const allCornersInside = corners.every(corner =>
                            isPointInPolygon(corner, roof.points)
                        );

                        if (allCornersInside) {
                            newPanels.push({
                                id: generateId(),
                                roofId: roof.id,
                                position: { x, y: roof.height || state.roofSettings.height, z: y },
                                rotation: {
                                    x: settings.tilt,
                                    y: settings.azimuth,
                                    z: 0
                                },
                                size: { width: panelWidth, height: panelHeight },
                                power: settings.power,
                                efficiency: state.solarAnalysis.efficiency,
                                shaded: false,
                                selected: false,
                                createdAt: Date.now(),
                            });
                        }
                    }

                    x += panelWidth + settings.spacing;
                }

                y += panelHeight + settings.rowSpacing;
            }

            set(state => ({
                panels: [...state.panels, ...newPanels]
            }));

            get().recalculateSolarAnalysis();

            return newPanels.length;
        },

        clearPanelsOnRoof: (roofId) => {
            get().saveStateToHistory();
            set(state => ({
                panels: state.panels.filter(panel => panel.roofId !== roofId),
            }));
            get().recalculateSolarAnalysis();
        },

        //    Solar Analysis                                                         
        recalculateSolarAnalysis: () => {
            const state = get();
            const totalPanels = state.panels.length;
            const totalDCCapacity = (totalPanels * state.panelSettings.power) / 1000; // kW

            // Estimated annual generation = DC Capacity   Irradiance   Efficiency   Performance Ratio
            const estimatedGeneration =
                totalDCCapacity *
                state.solarAnalysis.irradiance *
                state.solarAnalysis.efficiency *
                0.75; // Performance ratio (accounting for losses)

            set({
                solarAnalysis: {
                    ...state.solarAnalysis,
                    totalPanels,
                    totalDCCapacity: parseFloat(totalDCCapacity.toFixed(2)),
                    estimatedGeneration: parseFloat(estimatedGeneration.toFixed(2)),
                }
            });
        },

        updateSolarAnalysisSettings: (updates) => {
            set(state => ({
                solarAnalysis: { ...state.solarAnalysis, ...updates }
            }));
            get().recalculateSolarAnalysis();
        },

        //    Sun Simulation                                                         
        updateSunSimulation: (updates) => {
            set(state => ({
                sunSimulation: { ...state.sunSimulation, ...updates }
            }));
        },

        toggleSunSimulation: () => {
            set(state => ({
                sunSimulation: {
                    ...state.sunSimulation,
                    enabled: !state.sunSimulation.enabled
                }
            }));
        },

        //    Panel Settings                                                         
        updatePanelSettings: (updates) => {
            set(state => ({
                panelSettings: { ...state.panelSettings, ...updates }
            }));
        },

        toggleSnapToGrid: () => {
            set(state => ({
                panelSettings: {
                    ...state.panelSettings,
                    snapToGrid: !state.panelSettings.snapToGrid
                }
            }));
        },

        //    Obstacle Actions                                                       
        addObstacle: (obstacleData) => {
            get().saveStateToHistory();
            const obstacle = {
                id: generateId(),
                type: obstacleData.type || 'tree', // 'tree' | 'tank' | 'vent' | 'chimney'
                position: obstacleData.position || { x: 0, y: 0, z: 0 },
                size: obstacleData.size || { width: 2, height: 3, depth: 2 },
                roofId: obstacleData.roofId || get().selectedRoofId,
                createdAt: Date.now(),
                ...obstacleData,
            };

            set(state => ({
                obstacles: [...state.obstacles, obstacle]
            }));
        },

        updateObstacle: (obstacleId, updates) => {
            set(state => ({
                obstacles: state.obstacles.map(obs =>
                    obs.id === obstacleId ? { ...obs, ...updates } : obs
                )
            }));
        },

        deleteObstacle: (obstacleId) => {
            get().saveStateToHistory();
            set(state => ({
                obstacles: state.obstacles.filter(obs => obs.id !== obstacleId),
                selectedObstacleIds: state.selectedObstacleIds.filter(id => id !== obstacleId),
            }));
        },

        selectObstacles: (obstacleIds, addToSelection = false) => {
            set(state => ({
                selectedObstacleIds: addToSelection
                    ? [...new Set([...state.selectedObstacleIds, ...obstacleIds])]
                    : obstacleIds
            }));
        },

        clearObstacleSelection: () => set({ selectedObstacleIds: [] }),

        //    View & UI Actions                                                      
        setActiveTool: (tool) => set({ activeTool: tool }),

        setViewMode: (mode) => set({ viewMode: mode }),

        toggleViewMode: () => {
            set(state => ({
                viewMode: state.viewMode === '2d' ? '3d' : '2d'
            }));
        },

        updateViewSettings: (updates) => {
            set(state => ({
                viewSettings: { ...state.viewSettings, ...updates }
            }));
        },

        toggleGridVisibility: () => {
            set(state => ({
                viewSettings: {
                    ...state.viewSettings,
                    showGrid: !state.viewSettings.showGrid
                }
            }));
        },

        toggleShadows: () => {
            set(state => ({
                viewSettings: {
                    ...state.viewSettings,
                    showShadows: !state.viewSettings.showShadows
                }
            }));
        },

        toggleLabels: () => {
            set(state => ({
                viewSettings: {
                    ...state.viewSettings,
                    showLabels: !state.viewSettings.showLabels
                }
            }));
        },

        //    Save/Load Design                                                       
        saveDesign: () => {
            const state = get();
            const design = {
                version: '1.0',
                timestamp: Date.now(),
                roofs: state.roofs,
                panels: state.panels,
                obstacles: state.obstacles,
                panelSettings: state.panelSettings,
                roofSettings: state.roofSettings,
                solarAnalysis: state.solarAnalysis,
                sunSimulation: state.sunSimulation,
                viewSettings: state.viewSettings,
            };

            return JSON.stringify(design, null, 2);
        },

        loadDesign: (designJson) => {
            try {
                const design = JSON.parse(designJson);

                set({
                    roofs: design.roofs || [],
                    panels: design.panels || [],
                    obstacles: design.obstacles || [],
                    panelSettings: design.panelSettings || get().panelSettings,
                    roofSettings: design.roofSettings || get().roofSettings,
                    solarAnalysis: design.solarAnalysis || get().solarAnalysis,
                    sunSimulation: design.sunSimulation || get().sunSimulation,
                    viewSettings: design.viewSettings || get().viewSettings,
                    selectedRoofId: null,
                    selectedPanelIds: [],
                    selectedObstacleIds: [],
                });

                get().recalculateSolarAnalysis();
                get().saveStateToHistory();

                return true;
            } catch (error) {
                console.error('Failed to load design:', error);
                return false;
            }
        },

        exportDesign: () => {
            const designJson = get().saveDesign();
            const blob = new Blob([designJson], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `solar-design-${Date.now()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        },

        importDesign: (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();

                reader.onload = (e) => {
                    const success = get().loadDesign(e.target.result);
                    if (success) {
                        resolve(true);
                    } else {
                        reject(new Error('Failed to parse design file'));
                    }
                };

                reader.onerror = () => reject(reader.error);
                reader.readAsText(file);
            });
        },

        //    Recalculate (Legacy compatibility)                                    
        recalculate: () => {
            get().recalculateSolarAnalysis();
        },

        //    Reset                                                                  
        reset: () => {
            const defaultPanelSettings = {
                width: 2.0,
                height: 1.0,
                power: 400,
                tilt: 20,
                azimuth: 180,
                spacing: 0.05,
                rowSpacing: 1.5,
                orientation: 'landscape',
                snapToGrid: true,
                gridSize: 0.1,
            };

            const defaultRoofSettings = {
                height: 3.0,
                color: '#2a2a3a',
                selectedColor: '#1e3a5f',
            };

            const defaultSolarAnalysis = {
                totalPanels: 0,
                totalDCCapacity: 0,
                estimatedGeneration: 0,
                shadedPanels: [],
                efficiency: 0.85,
                irradiance: 1800,
            };

            set({
                roofs: [],
                panels: [],
                obstacles: [],
                selectedRoofId: null,
                editingRoofId: null,
                selectedPanelIds: [],
                draggedPanels: [],
                selectedObstacleIds: [],
                activeTool: 'select',
                isDrawing: false,
                isEditing: false,
                isDragging: false,
                panelSettings: defaultPanelSettings,
                roofSettings: defaultRoofSettings,
                solarAnalysis: defaultSolarAnalysis,
                history: {
                    states: [],
                    currentIndex: -1,
                    maxSize: 50,
                },
            });
        },
    }))
);

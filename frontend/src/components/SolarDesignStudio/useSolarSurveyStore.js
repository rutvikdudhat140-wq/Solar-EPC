// useSolarSurveyStore.js   Enhanced Solar Survey Design Store
// Handles: map boundaries, exclusion zones, panel auto-fill, shadow analysis, 3D state, measurements
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

//    Geo Utilities                                                              
const DEG2RAD = Math.PI / 180;
const EARTH_R = 6371000; // meters

// Haversine distance between two lat/lng points in meters
export const haversineDistance = (a, b) => {
    const dLat = (b.lat - a.lat) * DEG2RAD;
    const dLng = (b.lng - a.lng) * DEG2RAD;
    const sinLat = Math.sin(dLat / 2);
    const sinLng = Math.sin(dLng / 2);
    const h = sinLat * sinLat + Math.cos(a.lat * DEG2RAD) * Math.cos(b.lat * DEG2RAD) * sinLng * sinLng;
    return 2 * EARTH_R * Math.asin(Math.sqrt(h));
};

// Convert lat/lng polygon to local XY meters relative to centroid
export const latlngToLocalMeters = (latlngs) => {
    if (!latlngs || latlngs.length === 0) return { points: [], centroid: { lat: 0, lng: 0 } };
    const cLat = latlngs.reduce((s, p) => s + p.lat, 0) / latlngs.length;
    const cLng = latlngs.reduce((s, p) => s + p.lng, 0) / latlngs.length;
    const mPerDegLng = 111320 * Math.cos(cLat * DEG2RAD);
    const mPerDegLat = 110540;
    const points = latlngs.map(p => ({
        x: (p.lng - cLng) * mPerDegLng,
        y: (p.lat - cLat) * mPerDegLat,
    }));
    return { points, centroid: { lat: cLat, lng: cLng } };
};

// Convert local XY back to lat/lng
export const localMetersToLatlng = (x, y, centroid) => {
    const mPerDegLng = 111320 * Math.cos(centroid.lat * DEG2RAD);
    const mPerDegLat = 110540;
    return {
        lat: centroid.lat + y / mPerDegLat,
        lng: centroid.lng + x / mPerDegLng,
    };
};

// Polygon area using Shoelace formula (m )
export const polygonArea = (points) => {
    let area = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
};

// Point-in-polygon (ray casting)
export const isPointInPolygon = (px, py, polygon) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    return inside;
};

// Get polygon bounding box
const getBounds = (points) => ({
    minX: Math.min(...points.map(p => p.x)),
    maxX: Math.max(...points.map(p => p.x)),
    minY: Math.min(...points.map(p => p.y)),
    maxY: Math.max(...points.map(p => p.y)),
});

//    Sun Position Calculator                                                    
export const calculateSunPosition = (hour, dayOfYear, latitude) => {
    const declination = 23.45 * Math.sin(DEG2RAD * (360 / 365) * (dayOfYear - 81));
    const hourAngle = (hour - 12) * 15; // degrees
    const latRad = latitude * DEG2RAD;
    const decRad = declination * DEG2RAD;
    const haRad = hourAngle * DEG2RAD;

    const altitude = Math.asin(
        Math.sin(latRad) * Math.sin(decRad) +
        Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad)
    );

    const azimuth = Math.atan2(
        -Math.cos(decRad) * Math.sin(haRad),
        Math.cos(latRad) * Math.sin(decRad) - Math.sin(latRad) * Math.cos(decRad) * Math.cos(haRad)
    );

    return {
        altitude: altitude / DEG2RAD,
        azimuth: (azimuth / DEG2RAD + 360) % 360,
        altitudeRad: altitude,
        azimuthRad: azimuth,
    };
};

//    Shadow Calculator                                                          
export const calculatePanelShadow = (panel, sunPosition, panelHeight = 0.5) => {
    if (sunPosition.altitude <= 0) return null; // sun below horizon
    const shadowLength = panelHeight / Math.tan(sunPosition.altitudeRad);
    const shadowDx = shadowLength * Math.sin(sunPosition.azimuthRad);
    const shadowDy = -shadowLength * Math.cos(sunPosition.azimuthRad);
    return { dx: shadowDx, dy: shadowDy, length: shadowLength };
};

// Enhanced store with new features
const useSolarSurveyStoreDefault = create(subscribeWithSelector((set, get) => ({
    //    Map State                                                            
    mapCenter: { lat: 21.1702, lng: 72.8311 }, // Surat default
    mapZoom: 19,
    mapType: 'satellite', // 'satellite' | 'roadmap' | 'hybrid'

    //    Drawing State                                                        
    activeTool: 'select', // 'select' | 'drawBoundary' | 'drawExclusion' | 'addPanel' | 'measure' | 'delete'
    isDrawing: false,
    drawingPoints: [], // temporary points while drawing

    //    Boundaries (roof areas)                                              
    boundaries: [], // { id, name, latlngs: [{lat,lng}], localPoints: [{x,y}], centroid, area, color, height, panels:[] }
    selectedBoundaryId: null,

    //    Exclusion Zones                                                      
    exclusionZones: [], // { id, boundaryId, latlngs, localPoints, area, type: 'obstacle'|'shade'|'vent'|'custom', label }
    selectedExclusionId: null,

    //    Panels (auto-filled inside boundaries)                               
    panels: [], // { id, boundaryId, localX, localY, lat, lng, width, height, tilt, azimuth, shaded, power, shadeFactor }

    //    Panel Configuration                                                  
    panelConfig: {
        width: 2.0,          // meters
        height: 1.0,         // meters
        power: 545,          // watts per panel
        efficiency: 0.21,    // 21%
        tilt: 15,            // degrees
        azimuth: 180,        // degrees (south=180)
        spacing: 0.05,       // gap between panels in a row (meters)
        rowSpacing: 1.2,     // gap between rows (meters)
        orientation: 'landscape', // 'landscape' | 'portrait'
        setback: 0.5,        // distance from boundary edge (meters)
    },

    //    Solar Analysis                                                       
    analysis: {
        totalPanels: 0,
        totalCapacityKW: 0,
        usableArea: 0,       // m 
        totalArea: 0,        // m 
        exclusionArea: 0,    // m 
        coverageRatio: 0,    // %
        estimatedAnnualKWh: 0,
        shadedPanels: 0,
        avgShadeFactor: 0,
        irradiance: 1800,    // kWh/m /year (India avg)
        performanceRatio: 0.78,
        co2Offset: 0,        // tonnes/year
    },

    //    Sun Simulation                                                       
    sunSimulation: {
        enabled: false,
        hour: 12,
        dayOfYear: 172,      // June 21 (summer solstice)
        latitude: 21.17,
        animate: false,
        speed: 1,
    },

    //    View State                                                           
    viewMode: '2D', // '2D', '3D', 'SPLIT', 'OVERVIEW'
    cameraTransition: false,
    isTransitioning: false,
    showMeasurements: true,
    measurementMode: false,
    showGrid: true,
    showShadows: true,
    showLabels: true,
    showHeatmap: false,
    showExclusions: true,
    showPanelNumbers: false,
    show3DBuildings: true,

    //    History                                                              
    history: [],
    historyIndex: -1,

    //    Measurement                                                          
    measurePoints: [],
    measureDistance: 0,

    // Enhanced panel management
    selectedPanels: [],
    panelPresets: {
        standard: { width: 2.0, height: 1.0, capacity: 0.4, efficiency: 0.2 },
        premium: { width: 2.2, height: 1.1, capacity: 0.45, efficiency: 0.22 },
        compact: { width: 1.6, height: 1.0, capacity: 0.32, efficiency: 0.18 }
    },

    // Measurement system
    measurements: [],
    activeMeasurement: null,

    // 3D visualization settings
    rendering: {
        shadows: true,
        antialiasing: true,
        ambientOcclusion: false,
        quality: 'high' // 'low', 'medium', 'high'
    },

    // Enhanced panel settings with presets
    panelSettings: {
        moduleWidth: 2.0,
        moduleHeight: 1.0,
        capacity: 0.4, // kWp per panel
        efficiency: 0.2, // 20%
        spacing: 0.5, // meters between panels
        margin: 1.0, // meters from boundary
        tiltAngle: 15, // degrees
        azimuthAngle: 180, // degrees (south-facing)
        preset: 'standard'
    },

    //                                                                          
    // ACTIONS
    //                                                                          

    //    Map Actions                                                          
    setMapCenter: (center) => set({ mapCenter: center }),
    setMapZoom: (zoom) => set({ mapZoom: zoom }),
    setMapType: (type) => set({ mapType: type }),

    //    Tool Actions                                                         
    setActiveTool: (tool) => set({ activeTool: tool, isDrawing: tool === 'drawBoundary' || tool === 'drawExclusion' }),
    setViewMode: (mode) => set({ viewMode: mode }),
    setCameraTransition: (transitioning) => set({ cameraTransition: transitioning }),
    setIsTransitioning: (transitioning) => set({ isTransitioning: transitioning }),

    //    Boundary Actions                                                     
    addBoundary: (latlngs, name) => {
        const { points, centroid } = latlngToLocalMeters(latlngs);
        const area = polygonArea(points);
        const id = generateId();
        const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
        const boundary = {
            id,
            name: name || `Area ${get().boundaries.length + 1}`,
            latlngs,
            localPoints: points,
            centroid,
            area,
            color: colors[get().boundaries.length % colors.length],
            height: 3.0, // default building height
        };

        set(s => ({
            boundaries: [...s.boundaries, boundary],
            selectedBoundaryId: id,
            activeTool: 'select',
            isDrawing: false,
        }));

        get()._saveHistory();
        return id;
    },

    updateBoundary: (id, updates) => {
        set(s => ({
            boundaries: s.boundaries.map(b => b.id === id ? { ...b, ...updates } : b),
        }));
    },

    deleteBoundary: (id) => {
        set(s => ({
            boundaries: s.boundaries.filter(b => b.id !== id),
            exclusionZones: s.exclusionZones.filter(e => e.boundaryId !== id),
            panels: s.panels.filter(p => p.boundaryId !== id),
            selectedBoundaryId: s.selectedBoundaryId === id ? null : s.selectedBoundaryId,
        }));
        get().recalculateAnalysis();
        get()._saveHistory();
    },

    selectBoundary: (id) => set({ selectedBoundaryId: id, selectedExclusionId: null }),

    //    Exclusion Zone Actions                                               
    addExclusionZone: (latlngs, boundaryId, type = 'obstacle', label) => {
        const { points } = latlngToLocalMeters(latlngs);
        // Convert exclusion to boundary-local coordinates
        const boundary = get().boundaries.find(b => b.id === boundaryId);
        if (!boundary) return;

        const mPerDegLng = 111320 * Math.cos(boundary.centroid.lat * DEG2RAD);
        const mPerDegLat = 110540;
        const localPoints = latlngs.map(ll => ({
            x: (ll.lng - boundary.centroid.lng) * mPerDegLng,
            y: (ll.lat - boundary.centroid.lat) * mPerDegLat,
        }));

        const area = polygonArea(localPoints);
        const id = generateId();
        const zone = {
            id,
            boundaryId,
            latlngs,
            localPoints,
            area,
            type,
            label: label || `${type.charAt(0).toUpperCase() + type.slice(1)} ${get().exclusionZones.length + 1}`,
        };

        set(s => ({
            exclusionZones: [...s.exclusionZones, zone],
            selectedExclusionId: id,
            activeTool: 'select',
            isDrawing: false,
        }));

        // Re-fill panels for this boundary (remove panels in exclusion)
        get().autoFillPanels(boundaryId);
        get()._saveHistory();
        return id;
    },

    deleteExclusionZone: (id) => {
        const zone = get().exclusionZones.find(e => e.id === id);
        set(s => ({
            exclusionZones: s.exclusionZones.filter(e => e.id !== id),
            selectedExclusionId: null,
        }));
        if (zone) {
            get().autoFillPanels(zone.boundaryId);
        }
        get()._saveHistory();
    },

    selectExclusion: (id) => set({ selectedExclusionId: id }),

    //    Panel Auto-Fill                                                      
    autoFillPanels: (boundaryId) => {
        const state = get();
        const boundary = state.boundaries.find(b => b.id === boundaryId);
        if (!boundary || boundary.localPoints.length < 3) return 0;

        const config = state.panelConfig;
        const exclusions = state.exclusionZones.filter(e => e.boundaryId === boundaryId);

        // Panel dimensions based on orientation
        const pw = config.orientation === 'landscape' ? config.width : config.height;
        const ph = config.orientation === 'landscape' ? config.height : config.width;
        const setback = config.setback;

        const bounds = getBounds(boundary.localPoints);

        // Create an inset polygon for setback
        const newPanels = [];
        let y = bounds.minY + setback + ph / 2;

        while (y <= bounds.maxY - setback - ph / 2) {
            let x = bounds.minX + setback + pw / 2;

            while (x <= bounds.maxX - setback - pw / 2) {
                // Check all 4 corners + center are inside boundary
                const corners = [
                    { x: x - pw / 2, y: y - ph / 2 },
                    { x: x + pw / 2, y: y - ph / 2 },
                    { x: x + pw / 2, y: y + ph / 2 },
                    { x: x - pw / 2, y: y + ph / 2 },
                ];

                const centerInside = isPointInPolygon(x, y, boundary.localPoints);
                const allCornersInside = corners.every(c =>
                    isPointInPolygon(c.x, c.y, boundary.localPoints)
                );

                if (centerInside && allCornersInside) {
                    // Check NOT inside any exclusion zone
                    const inExclusion = exclusions.some(exc =>
                        isPointInPolygon(x, y, exc.localPoints) ||
                        corners.some(c => isPointInPolygon(c.x, c.y, exc.localPoints))
                    );

                    if (!inExclusion) {
                        const latlng = localMetersToLatlng(x, y, boundary.centroid);
                        newPanels.push({
                            id: generateId(),
                            boundaryId,
                            localX: x,
                            localY: y,
                            lat: latlng.lat,
                            lng: latlng.lng,
                            width: pw,
                            height: ph,
                            tilt: config.tilt,
                            azimuth: config.azimuth,
                            power: config.power,
                            shaded: false,
                            shadeFactor: 1.0,
                        });
                    }
                }
                x += pw + config.spacing;
            }
            y += ph + config.rowSpacing;
        }

        // Replace panels for this boundary
        set(s => ({
            panels: [
                ...s.panels.filter(p => p.boundaryId !== boundaryId),
                ...newPanels,
            ],
        }));

        get().recalculateAnalysis();
        return newPanels.length;
    },

    clearPanels: (boundaryId) => {
        set(s => ({
            panels: boundaryId
                ? s.panels.filter(p => p.boundaryId !== boundaryId)
                : [],
        }));
        get().recalculateAnalysis();
    },

    //    Shadow Analysis                                                      
    runShadowAnalysis: () => {
        const state = get();
        const { hour, dayOfYear, latitude } = state.sunSimulation;
        const sunPos = calculateSunPosition(hour, dayOfYear, latitude);

        if (sunPos.altitude <= 2) {
            // Sun too low   all panels shaded
            set(s => ({
                panels: s.panels.map(p => ({ ...p, shaded: true, shadeFactor: 0.1 })),
            }));
            get().recalculateAnalysis();
            return;
        }

        const exclusions = state.exclusionZones;
        const updatedPanels = state.panels.map(panel => {
            const boundary = state.boundaries.find(b => b.id === panel.boundaryId);
            if (!boundary) return panel;

            // Check if panel is near exclusion zone shadow
            let shadeFactor = 1.0;
            let shaded = false;

            exclusions.filter(e => e.boundaryId === panel.boundaryId).forEach(exc => {
                // Simple shadow projection: obstacles cast shadows based on sun angle
                const shadowInfo = calculatePanelShadow(
                    { x: panel.localX, y: panel.localY },
                    sunPos,
                    2.0 // assumed obstacle height
                );

                if (shadowInfo) {
                    // Check if panel is within shadow zone of any exclusion vertex
                    exc.localPoints.forEach(ep => {
                        const shadowEndX = ep.x + shadowInfo.dx;
                        const shadowEndY = ep.y + shadowInfo.dy;
                        const distToShadow = Math.sqrt(
                            (panel.localX - shadowEndX) ** 2 + (panel.localY - shadowEndY) ** 2
                        );
                        if (distToShadow < 3.0) {
                            shaded = true;
                            shadeFactor = Math.min(shadeFactor, 0.3 + (distToShadow / 3.0) * 0.7);
                        }
                    });
                }
            });

            // Edge panels get slight shadow reduction
            const bounds = getBounds(boundary.localPoints);
            const edgeDist = Math.min(
                panel.localX - bounds.minX,
                bounds.maxX - panel.localX,
                panel.localY - bounds.minY,
                bounds.maxY - panel.localY,
            );
            if (edgeDist < 1.5) {
                shadeFactor *= 0.85 + (edgeDist / 1.5) * 0.15;
            }

            return { ...panel, shaded, shadeFactor: Math.max(0.1, Math.min(1.0, shadeFactor)) };
        });

        set({ panels: updatedPanels });
        get().recalculateAnalysis();
    },

    //    Analysis Recalculation                                               
    recalculateAnalysis: () => {
        const state = get();
        const totalPanels = state.panels.length;
        const config = state.panelConfig;

        const totalArea = state.boundaries.reduce((s, b) => s + b.area, 0);
        const exclusionArea = state.exclusionZones.reduce((s, e) => s + e.area, 0);
        const usableArea = totalArea - exclusionArea;

        const panelArea = config.width * config.height;
        const totalPanelArea = totalPanels * panelArea;
        const coverageRatio = usableArea > 0 ? (totalPanelArea / usableArea) * 100 : 0;

        const totalCapacityKW = (totalPanels * config.power) / 1000;

        const avgShadeFactor = totalPanels > 0
            ? state.panels.reduce((s, p) => s + p.shadeFactor, 0) / totalPanels
            : 1;

        const shadedPanels = state.panels.filter(p => p.shaded).length;

        const irradiance = state.analysis.irradiance;
        const pr = state.analysis.performanceRatio;
        const estimatedAnnualKWh = totalCapacityKW * irradiance * pr * avgShadeFactor;
        const co2Offset = estimatedAnnualKWh * 0.00082; // India grid emission factor

        set({
            analysis: {
                ...state.analysis,
                totalPanels,
                totalCapacityKW: +totalCapacityKW.toFixed(2),
                usableArea: +usableArea.toFixed(1),
                totalArea: +totalArea.toFixed(1),
                exclusionArea: +exclusionArea.toFixed(1),
                coverageRatio: +coverageRatio.toFixed(1),
                estimatedAnnualKWh: +estimatedAnnualKWh.toFixed(0),
                shadedPanels,
                avgShadeFactor: +avgShadeFactor.toFixed(2),
                co2Offset: +co2Offset.toFixed(2),
            },
        });
    },

    //    Panel Config                                                         
    updatePanelConfig: (updates) => {
        set(s => ({ panelConfig: { ...s.panelConfig, ...updates } }));
    },

    //    Sun Simulation                                                       
    updateSunSimulation: (updates) => {
        set(s => ({ sunSimulation: { ...s.sunSimulation, ...updates } }));
        if (get().sunSimulation.enabled) {
            get().runShadowAnalysis();
        }
    },

    toggleSunSimulation: () => {
        const enabled = !get().sunSimulation.enabled;
        set(s => ({ sunSimulation: { ...s.sunSimulation, enabled } }));
        if (enabled) get().runShadowAnalysis();
    },

    //    View Toggles                                                         
    toggleShowGrid: () => set(s => ({ showGrid: !s.showGrid })),
    toggleShowShadows: () => set(s => ({ showShadows: !s.showShadows })),
    toggleShowLabels: () => set(s => ({ showLabels: !s.showLabels })),
    toggleShowHeatmap: () => set(s => ({ showHeatmap: !s.showHeatmap })),
    toggleShowExclusions: () => set(s => ({ showExclusions: !s.showExclusions })),
    toggleShow3DBuildings: () => set(s => ({ show3DBuildings: !s.show3DBuildings })),

    //    Measurement                                                          
    addMeasurePoint: (latlng) => {
        const pts = [...get().measurePoints, latlng];
        let dist = 0;
        for (let i = 1; i < pts.length; i++) {
            dist += haversineDistance(pts[i - 1], pts[i]);
        }
        set({ measurePoints: pts, measureDistance: dist });
    },

    clearMeasure: () => set({ measurePoints: [], measureDistance: 0 }),

    // Enhanced panel management
    setPanels: (panels) => set({ panels }),
    addPanels: (newPanels) => set(state => ({
        panels: [...state.panels, ...newPanels]
    })),
    removePanels: (panelIds) => set(state => ({
        panels: state.panels.filter(p => !panelIds.includes(p.id)),
        selectedPanels: state.selectedPanels.filter(id => !panelIds.includes(id))
    })),
    selectPanel: (panelId) => set(state => {
        const newSelection = state.selectedPanels.includes(panelId)
            ? state.selectedPanels.filter(id => id !== panelId)
            : [...state.selectedPanels, panelId];

        return {
            selectedPanels: newSelection,
            panels: state.panels.map(p => ({
                ...p,
                isSelected: newSelection.includes(p.id)
            }))
        };
    }),
    selectMultiplePanels: (panelIds) => set(state => ({
        selectedPanels: panelIds,
        panels: state.panels.map(p => ({
            ...p,
            isSelected: panelIds.includes(p.id)
        }))
    })),
    clearPanelSelection: () => set(state => ({
        selectedPanels: [],
        panels: state.panels.map(p => ({ ...p, isSelected: false }))
    })),
    togglePanelExclusion: (panelId) => set(state => ({
        panels: state.panels.map(p =>
            p.id === panelId ? { ...p, isExcluded: !p.isExcluded } : p
        )
    })),
    updatePanelProperties: (panelId, properties) => set(state => ({
        panels: state.panels.map(p =>
            p.id === panelId ? { ...p, ...properties } : p
        )
    })),

    // Panel preset management
    applyPanelPreset: (presetName) => set(state => {
        const preset = state.panelPresets[presetName];
        if (!preset) return state;

        return {
            panelSettings: {
                ...state.panelSettings,
                ...preset,
                preset: presetName
            }
        };
    }),

    // Measurement system
    addMeasurement: (measurement) => set(state => ({
        measurements: [...state.measurements, {
            id: generateId(),
            ...measurement,
            created: new Date().toISOString()
        }]
    })),
    removeMeasurement: (measurementId) => set(state => ({
        measurements: state.measurements.filter(m => m.id !== measurementId)
    })),
    clearMeasurements: () => set({ measurements: [] }),
    setMeasurementMode: (enabled) => set({ measurementMode: enabled }),
    setShowMeasurements: (show) => set({ showMeasurements: show }),

    // Enhanced analysis with more metrics
    calculateAnalysis: () => set(state => {
        const { panels, areas, exclusionZones } = state;

        // Basic panel statistics
        const totalPanels = panels.length;
        const excludedPanels = panels.filter(p => p.isExcluded).length;
        const activePanels = totalPanels - excludedPanels;
        const shadedPanels = panels.filter(p => p.shadowFactor < 0.8).length;

        // Capacity calculations
        const totalCapacityKW = activePanels * (state.panelSettings.capacity || 0.4);
        const maxCapacityKW = totalPanels * (state.panelSettings.capacity || 0.4);

        // Area calculations
        const totalArea = areas.reduce((sum, area) => sum + (area.area || 0), 0);
        const panelArea = activePanels * (state.panelSettings.moduleWidth || 2.0) * (state.panelSettings.moduleHeight || 1.0);
        const coverage = totalArea > 0 ? (panelArea / totalArea) * 100 : 0;

        // Energy calculations (simplified)
        const avgSunHours = 5.5; // Average daily sun hours
        const systemEfficiency = 0.85; // System losses
        const avgShadingFactor = panels.reduce((sum, p) => sum + (p.shadowFactor || 1), 0) / Math.max(panels.length, 1);

        const dailyKWh = totalCapacityKW * avgSunHours * systemEfficiency * avgShadingFactor;
        const monthlyKWh = dailyKWh * 30;
        const estimatedAnnualKWh = dailyKWh * 365;

        // Financial estimates (rough)
        const costPerWatt = 2.5; // USD per watt installed
        const installationCost = totalCapacityKW * 1000 * costPerWatt;
        const annualSavings = estimatedAnnualKWh * 0.12; // $0.12 per kWh
        const paybackYears = installationCost > 0 ? installationCost / annualSavings : 0;

        // CO2 savings (kg CO2 per kWh varies by region, using average)
        const co2SavingsKgPerYear = estimatedAnnualKWh * 0.5; // 0.5 kg CO2 per kWh

        return {
            analysis: {
                // Panel statistics
                totalPanels,
                activePanels,
                excludedPanels,
                shadedPanels,

                // Capacity
                totalCapacityKW: Math.round(totalCapacityKW * 100) / 100,
                maxCapacityKW: Math.round(maxCapacityKW * 100) / 100,
                utilizationPercent: maxCapacityKW > 0 ? (totalCapacityKW / maxCapacityKW) * 100 : 0,

                // Area and coverage
                totalArea: Math.round(totalArea),
                panelArea: Math.round(panelArea),
                coverage: Math.round(coverage * 10) / 10,

                // Energy production
                dailyKWh: Math.round(dailyKWh * 10) / 10,
                monthlyKWh: Math.round(monthlyKWh),
                estimatedAnnualKWh: Math.round(estimatedAnnualKWh),

                // Performance
                avgShadingFactor: Math.round(avgShadingFactor * 100) / 100,
                systemEfficiency: Math.round(systemEfficiency * 100),

                // Financial
                installationCost: Math.round(installationCost),
                annualSavings: Math.round(annualSavings),
                paybackYears: Math.round(paybackYears * 10) / 10,

                // Environmental
                co2SavingsKgPerYear: Math.round(co2SavingsKgPerYear),
                co2SavingsTonnesPerYear: Math.round(co2SavingsKgPerYear / 1000 * 100) / 100,

                // Timestamp
                lastCalculated: new Date().toISOString()
            }
        };
    }),

    // Bulk operations
    bulkUpdatePanels: (panelIds, updates) => set(state => ({
        panels: state.panels.map(p =>
            panelIds.includes(p.id) ? { ...p, ...updates } : p
        )
    })),

    // Export functionality
    exportDesign: () => {
        const state = get();
        return {
            version: '2.0',
            timestamp: new Date().toISOString(),
            areas: state.areas,
            panels: state.panels,
            exclusionZones: state.exclusionZones,
            measurements: state.measurements,
            analysis: state.analysis,
            settings: {
                panelSettings: state.panelSettings,
                sunSimulation: state.sunSimulation,
                rendering: state.rendering
            }
        };
    },

    // Import functionality
    importDesign: (designData) => set(state => {
        try {
            const data = typeof designData === 'string' ? JSON.parse(designData) : designData;

            return {
                ...state,
                areas: data.areas || [],
                panels: data.panels || [],
                exclusionZones: data.exclusionZones || [],
                measurements: data.measurements || [],
                panelSettings: { ...state.panelSettings, ...data.settings?.panelSettings },
                sunSimulation: { ...state.sunSimulation, ...data.settings?.sunSimulation },
                rendering: { ...state.rendering, ...data.settings?.rendering }
            };
        } catch (error) {
            console.error('Failed to import design:', error);
            return state;
        }
    }),

    // Initialize store with enhanced defaults
    initializeStore: () => set((state) => ({
        ...state,
        initialized: true,
        areas: [],
        panels: [],
        exclusionZones: [],
        measurements: [],
        selectedAreaId: null,
        selectedPanels: [],
        analysis: {
            totalPanels: 0,
            activePanels: 0,
            excludedPanels: 0,
            shadedPanels: 0,
            totalCapacityKW: 0,
            coverage: 0,
            estimatedAnnualKWh: 0,
            lastCalculated: new Date().toISOString()
        }
    })),

    //    History                                                              
    _saveHistory: () => {
        const s = get();
        const snapshot = {
            boundaries: JSON.parse(JSON.stringify(s.boundaries)),
            exclusionZones: JSON.parse(JSON.stringify(s.exclusionZones)),
            panels: JSON.parse(JSON.stringify(s.panels)),
        };
        const newHistory = [...s.history.slice(0, s.historyIndex + 1), snapshot];
        if (newHistory.length > 50) newHistory.shift();
        set({ history: newHistory, historyIndex: newHistory.length - 1 });
    },

    undo: () => {
        const s = get();
        if (s.historyIndex > 0) {
            const prev = s.history[s.historyIndex - 1];
            set({
                boundaries: prev.boundaries,
                exclusionZones: prev.exclusionZones,
                panels: prev.panels,
                historyIndex: s.historyIndex - 1,
            });
            get().recalculateAnalysis();
        }
    },

    redo: () => {
        const s = get();
        if (s.historyIndex < s.history.length - 1) {
            const next = s.history[s.historyIndex + 1];
            set({
                boundaries: next.boundaries,
                exclusionZones: next.exclusionZones,
                panels: next.panels,
                historyIndex: s.historyIndex + 1,
            });
            get().recalculateAnalysis();
        }
    },

    canUndo: () => get().historyIndex > 0,
    canRedo: () => get().historyIndex < get().history.length - 1,

    //    Reset                                                                
    reset: () => set({
        boundaries: [],
        exclusionZones: [],
        panels: [],
        selectedBoundaryId: null,
        selectedExclusionId: null,
        activeTool: 'select',
        isDrawing: false,
        drawingPoints: [],
        measurePoints: [],
        measureDistance: 0,
        history: [],
        historyIndex: -1,
        analysis: {
            totalPanels: 0,
            totalCapacityKW: 0,
            usableArea: 0,
            totalArea: 0,
            exclusionArea: 0,
            coverageRatio: 0,
            estimatedAnnualKWh: 0,
            shadedPanels: 0,
            avgShadeFactor: 0,
            irradiance: 1800,
            performanceRatio: 0.78,
            co2Offset: 0,
        },
    }),

    // Enhanced 3D rendering controls
    setRendering: (updates) => set(state => ({
        rendering: { ...state.rendering, ...updates }
    })),

    // Areas management (compatibility with new names)
    getAreas: () => get().boundaries,
    setAreas: (areas) => set({ boundaries: areas }),
    addArea: (area) => get().addBoundary(area.latlngs || area.coordinates, area.name),
    removeArea: (id) => get().deleteBoundary(id),
    getSelectedAreaId: () => get().selectedBoundaryId,
    setSelectedAreaId: (id) => get().selectBoundary(id),

})));

// Named export for backward compatibility
export const useSolarSurveyStore = useSolarSurveyStoreDefault;

export default useSolarSurveyStoreDefault;

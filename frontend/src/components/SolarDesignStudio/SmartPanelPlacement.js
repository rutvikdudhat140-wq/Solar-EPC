// SmartPanelPlacement.js   Intelligent panel placement system with manual overrides
import React, { useState, useRef, useCallback } from 'react';
import { useSolarSurveyStore } from './useSolarSurveyStore';

// Panel placement algorithms
const PanelPlacementEngine = {
    // Auto-generate optimal panel placement
    generateOptimalPlacement: (area, panelSpecs, exclusionZones = []) => {
        const { localBoundary } = area;
        if (!localBoundary || localBoundary.length < 3) return [];

        const panelWidth = panelSpecs.width || 2.0;
        const panelHeight = panelSpecs.height || 1.0;
        const spacing = panelSpecs.spacing || 0.5;
        const margin = panelSpecs.margin || 1.0;

        // Calculate bounding box
        const minX = Math.min(...localBoundary.map(p => p.x)) + margin;
        const maxX = Math.max(...localBoundary.map(p => p.x)) - margin;
        const minY = Math.min(...localBoundary.map(p => p.y)) + margin;
        const maxY = Math.max(...localBoundary.map(p => p.y)) - margin;

        const panels = [];
        let panelId = 0;

        // Grid-based placement
        const rows = Math.floor((maxY - minY) / (panelHeight + spacing));
        const cols = Math.floor((maxX - minX) / (panelWidth + spacing));

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = minX + (col * (panelWidth + spacing)) + (panelWidth / 2);
                const y = minY + (row * (panelHeight + spacing)) + (panelHeight / 2);

                // Check if point is inside area boundary
                if (!this.isPointInPolygon({ x, y }, localBoundary)) continue;

                // Check if point is in exclusion zone
                const inExclusionZone = exclusionZones.some(zone =>
                    zone.localBoundary && this.isPointInPolygon({ x, y }, zone.localBoundary)
                );
                if (inExclusionZone) continue;

                // Add panel
                panels.push({
                    id: `panel_${area.id}_${panelId++}`,
                    x: x,
                    z: y, // Convert Y to Z for 3D
                    areaId: area.id,
                    width: panelWidth,
                    height: panelHeight,
                    capacity: panelSpecs.capacity || 0.4, // kWp
                    efficiency: panelSpecs.efficiency || 0.2,
                    tilt: area.tilt || 15,
                    azimuth: area.azimuth || 180,
                    isSelected: false,
                    isExcluded: false,
                    shadowFactor: 1.0,
                    created: new Date().toISOString()
                });
            }
        }

        return panels;
    },

    // Check if point is inside polygon using ray casting
    isPointInPolygon: (point, polygon) => {
        const { x, y } = point;
        let inside = false;

        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;

            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }

        return inside;
    },

    // Optimize panel layout for maximum solar exposure
    optimizeForSolar: (panels, area, sunPath = []) => {
        return panels.map(panel => {
            // Calculate optimal tilt and azimuth based on location and sun path
            const optimalTilt = this.calculateOptimalTilt(area.center?.lat || 28.54);
            const optimalAzimuth = this.calculateOptimalAzimuth(area.center?.lat || 28.54);

            // Calculate shading factor based on surrounding panels
            const shadingFactor = this.calculateShadingFactor(panel, panels, sunPath);

            return {
                ...panel,
                tilt: optimalTilt,
                azimuth: optimalAzimuth,
                shadowFactor: shadingFactor,
                efficiency: panel.efficiency * shadingFactor,
                estimatedOutput: (panel.capacity * shadingFactor * 8760 * 0.15) // Rough annual kWh
            };
        });
    },

    // Calculate optimal tilt angle based on latitude
    calculateOptimalTilt: (latitude) => {
        // Simple formula: optimal tilt   latitude (with adjustments)
        return Math.max(10, Math.min(45, Math.abs(latitude)));
    },

    // Calculate optimal azimuth (south-facing in northern hemisphere)
    calculateOptimalAzimuth: (latitude) => {
        return latitude >= 0 ? 180 : 0; // South for north, North for south
    },

    // Calculate shading factor (simplified)
    calculateShadingFactor: (panel, allPanels, sunPath) => {
        // Simplified shading calculation
        // In reality, this would consider sun angles throughout the year
        const nearbyPanels = allPanels.filter(p =>
            p.id !== panel.id &&
            Math.sqrt((p.x - panel.x) ** 2 + (p.z - panel.z) ** 2) < 10
        );

        // Basic shading reduction based on nearby panels
        const shadingReduction = Math.max(0, 1 - (nearbyPanels.length * 0.05));
        return shadingReduction;
    }
};

// Panel selection and manipulation component
const PanelSelector = ({ position, onSelect, onExclude, onDelete }) => {
    return (
        <div style={{
            position: 'absolute',
            left: position.x,
            top: position.y,
            background: 'rgba(2, 6, 23, 0.95)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 8,
            padding: 8,
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
            zIndex: 1000,
            minWidth: 140
        }}>
            <button
                onClick={onSelect}
                style={{
                    width: '100%',
                    padding: '6px 12px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: '#3b82f6',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: 4,
                    fontSize: 12,
                    cursor: 'pointer',
                    marginBottom: 4
                }}
            >
                   Select Panel
            </button>
            <button
                onClick={onExclude}
                style={{
                    width: '100%',
                    padding: '6px 12px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 4,
                    fontSize: 12,
                    cursor: 'pointer',
                    marginBottom: 4
                }}
            >
                   Mark as Excluded
            </button>
            <button
                onClick={onDelete}
                style={{
                    width: '100%',
                    padding: '6px 12px',
                    background: 'rgba(156, 163, 175, 0.2)',
                    color: '#9ca3af',
                    border: '1px solid rgba(156, 163, 175, 0.3)',
                    borderRadius: 4,
                    fontSize: 12,
                    cursor: 'pointer'
                }}
            >
                    Delete Panel
            </button>
        </div>
    );
};

// Main Smart Panel Placement Component
const SmartPanelPlacement = () => {
    const {
        areas,
        panels,
        exclusionZones,
        selectedAreaId,
        panelSettings,
        setPanels,
        addPanels,
        removePanels,
        togglePanelExclusion,
        selectPanel,
        analysis
    } = useSolarSurveyStore();

    const [isPlacing, setIsPlacing] = useState(false);
    const [selectedPanels, setSelectedPanels] = useState([]);
    const [showSelector, setShowSelector] = useState(false);
    const [selectorPosition, setSelectorPosition] = useState({ x: 0, y: 0 });
    const [selectedPanelId, setSelectedPanelId] = useState(null);

    // Auto-generate panels for selected area
    const generatePanelsForArea = useCallback(async (areaId) => {
        const area = areas.find(a => a.id === areaId);
        if (!area || !area.localBoundary) return;

        setIsPlacing(true);

        try {
            // Get exclusion zones for this area
            const areaExclusionZones = exclusionZones.filter(z => z.areaId === areaId);

            // Generate optimal placement
            const newPanels = PanelPlacementEngine.generateOptimalPlacement(
                area,
                {
                    width: panelSettings.moduleWidth || 2.0,
                    height: panelSettings.moduleHeight || 1.0,
                    spacing: panelSettings.spacing || 0.5,
                    margin: panelSettings.margin || 1.0,
                    capacity: panelSettings.capacity || 0.4,
                    efficiency: panelSettings.efficiency || 0.2
                },
                areaExclusionZones
            );

            // Optimize for solar exposure
            const optimizedPanels = PanelPlacementEngine.optimizeForSolar(newPanels, area);

            // Remove existing panels for this area and add new ones
            const existingPanels = panels.filter(p => p.areaId !== areaId);
            setPanels([...existingPanels, ...optimizedPanels]);

        } catch (error) {
            console.error('Error generating panels:', error);
        } finally {
            setIsPlacing(false);
        }
    }, [areas, exclusionZones, panelSettings, panels, setPanels]);

    // Smart fill remaining spaces
    const smartFillRemaining = useCallback(async () => {
        if (!selectedAreaId) return;

        const area = areas.find(a => a.id === selectedAreaId);
        if (!area) return;

        setIsPlacing(true);

        try {
            // Get current panels and exclusion zones
            const currentPanels = panels.filter(p => p.areaId === selectedAreaId);
            const areaExclusionZones = exclusionZones.filter(z => z.areaId === selectedAreaId);

            // Create temporary exclusion zones around existing panels
            const panelExclusions = currentPanels.map(panel => ({
                id: `temp_${panel.id}`,
                localBoundary: [
                    { x: panel.x - 1.5, y: panel.z - 1.5 },
                    { x: panel.x + 1.5, y: panel.z - 1.5 },
                    { x: panel.x + 1.5, y: panel.z + 1.5 },
                    { x: panel.x - 1.5, y: panel.z + 1.5 }
                ]
            }));

            // Generate new panels avoiding existing ones
            const newPanels = PanelPlacementEngine.generateOptimalPlacement(
                area,
                panelSettings,
                [...areaExclusionZones, ...panelExclusions]
            );

            // Add only the new panels
            if (newPanels.length > 0) {
                addPanels(newPanels);
            }

        } catch (error) {
            console.error('Error filling remaining spaces:', error);
        } finally {
            setIsPlacing(false);
        }
    }, [selectedAreaId, areas, panels, exclusionZones, panelSettings, addPanels]);

    // Handle panel click
    const handlePanelClick = useCallback((panelId, event) => {
        if (event.detail === 2) { // Double click
            selectPanel(panelId);
        } else {
            // Single click - show context menu
            setSelectedPanelId(panelId);
            setSelectorPosition({ x: event.clientX, y: event.clientY });
            setShowSelector(true);
        }
    }, [selectPanel]);

    // Clear selection when clicking outside
    useCallback(() => {
        const handleClickOutside = () => {
            setShowSelector(false);
            setSelectedPanelId(null);
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* Panel Generation Controls */}
            <div style={{
                position: 'absolute',
                top: 16,
                left: 16,
                background: 'rgba(2, 6, 23, 0.92)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 12,
                padding: 16,
                backdropFilter: 'blur(12px)',
                minWidth: 280,
                zIndex: 10
            }}>
                <div style={{
                    fontSize: 14,
                    color: '#f1f5f9',
                    fontWeight: 700,
                    marginBottom: 12
                }}>
                       Smart Panel Placement
                </div>

                {selectedAreaId ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {/* Auto Generate */}
                        <button
                            onClick={() => generatePanelsForArea(selectedAreaId)}
                            disabled={isPlacing}
                            style={{
                                padding: '10px 16px',
                                background: isPlacing ? 'rgba(156, 163, 175, 0.3)' : 'rgba(34, 197, 94, 0.2)',
                                color: isPlacing ? '#9ca3af' : '#22c55e',
                                border: `1px solid ${isPlacing ? 'rgba(156, 163, 175, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: isPlacing ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isPlacing ? '  Generating...' : '  Auto-Generate Panels'}
                        </button>

                        {/* Smart Fill */}
                        <button
                            onClick={smartFillRemaining}
                            disabled={isPlacing}
                            style={{
                                padding: '8px 16px',
                                background: 'rgba(59, 130, 246, 0.2)',
                                color: '#3b82f6',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: isPlacing ? 'not-allowed' : 'pointer'
                            }}
                        >
                               Fill Remaining Spaces
                        </button>

                        {/* Clear All */}
                        <button
                            onClick={() => removePanels(panels.filter(p => p.areaId === selectedAreaId).map(p => p.id))}
                            style={{
                                padding: '6px 16px',
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: 6,
                                fontSize: 11,
                                cursor: 'pointer'
                            }}
                        >
                                Clear All Panels
                        </button>
                    </div>
                ) : (
                    <div style={{
                        padding: '16px',
                        textAlign: 'center',
                        color: '#64748b',
                        fontSize: 12
                    }}>
                        Select an area to begin panel placement
                    </div>
                )}

                {/* Panel Statistics */}
                {analysis.totalPanels > 0 && (
                    <div style={{
                        marginTop: 16,
                        padding: 12,
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: 8
                    }}>
                        <div style={{
                            fontSize: 11,
                            color: '#64748b',
                            marginBottom: 8,
                            fontWeight: 700,
                            textTransform: 'uppercase'
                        }}>
                            Panel Statistics
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
                            <div>
                                <div style={{ color: '#64748b' }}>Total Panels</div>
                                <div style={{ color: '#f1f5f9', fontWeight: 700, fontFamily: 'monospace' }}>
                                    {analysis.totalPanels}
                                </div>
                            </div>
                            <div>
                                <div style={{ color: '#64748b' }}>Total Capacity</div>
                                <div style={{ color: '#f59e0b', fontWeight: 700, fontFamily: 'monospace' }}>
                                    {analysis.totalCapacityKW} kWp
                                </div>
                            </div>
                            <div>
                                <div style={{ color: '#64748b' }}>Coverage</div>
                                <div style={{ color: '#22c55e', fontWeight: 700, fontFamily: 'monospace' }}>
                                    {analysis.coverage?.toFixed(1)}%
                                </div>
                            </div>
                            <div>
                                <div style={{ color: '#64748b' }}>Excluded</div>
                                <div style={{ color: analysis.excludedPanels > 0 ? '#ef4444' : '#64748b', fontWeight: 700, fontFamily: 'monospace' }}>
                                    {analysis.excludedPanels || 0}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Panel Selector Context Menu */}
            {showSelector && selectedPanelId && (
                <PanelSelector
                    position={selectorPosition}
                    onSelect={() => {
                        selectPanel(selectedPanelId);
                        setShowSelector(false);
                    }}
                    onExclude={() => {
                        togglePanelExclusion(selectedPanelId);
                        setShowSelector(false);
                    }}
                    onDelete={() => {
                        removePanels([selectedPanelId]);
                        setShowSelector(false);
                    }}
                />
            )}

            {/* Loading Overlay */}
            {isPlacing && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 20
                }}>
                    <div style={{
                        background: 'rgba(2, 6, 23, 0.95)',
                        padding: '20px 32px',
                        borderRadius: 12,
                        backdropFilter: 'blur(12px)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>  </div>
                        <div style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                            Generating Optimal Panel Layout...
                        </div>
                        <div style={{ color: '#64748b', fontSize: 12 }}>
                            This may take a few moments
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartPanelPlacement;

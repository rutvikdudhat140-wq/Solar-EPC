// EnhancedSurveyToolbar.js   Advanced toolbar with 2D/3D tools and smart features
import React, { useState } from 'react';
import { useSolarSurveyStore } from './useSolarSurveyStore';
import {
    Map,
    Box,
    Ruler,
    Layers,
    Zap,
    Sun,
    Settings,
    Download,
    Upload,
    RotateCcw,
    Eye,
    EyeOff,
    Grid3X3,
    Circle,
    Square,
    Shapes, // Using Shapes instead of Polygon
    MousePointer,
    Move3D,
    Camera,
    Maximize2
} from 'lucide-react';

// Tool Button Component
const ToolButton = ({
    icon: Icon,
    label,
    isActive = false,
    onClick,
    disabled = false,
    variant = 'default',
    size = 'default'
}) => {
    const variants = {
        default: {
            active: 'rgba(59, 130, 246, 0.3)',
            inactive: 'rgba(55, 65, 81, 0.2)',
            activeColor: '#3b82f6',
            inactiveColor: '#94a3b8'
        },
        success: {
            active: 'rgba(34, 197, 94, 0.3)',
            inactive: 'rgba(55, 65, 81, 0.2)',
            activeColor: '#22c55e',
            inactiveColor: '#94a3b8'
        },
        warning: {
            active: 'rgba(251, 191, 36, 0.3)',
            inactive: 'rgba(55, 65, 81, 0.2)',
            activeColor: '#fbbf24',
            inactiveColor: '#94a3b8'
        },
        danger: {
            active: 'rgba(239, 68, 68, 0.3)',
            inactive: 'rgba(55, 65, 81, 0.2)',
            activeColor: '#ef4444',
            inactiveColor: '#94a3b8'
        }
    };

    const sizes = {
        small: { padding: '6px 8px', fontSize: 10, iconSize: 12 },
        default: { padding: '8px 12px', fontSize: 11, iconSize: 14 },
        large: { padding: '12px 16px', fontSize: 12, iconSize: 16 }
    };

    const variantStyle = variants[variant] || variants.default;
    const sizeStyle = sizes[size] || sizes.default;

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={label}
            style={{
                padding: sizeStyle.padding,
                background: isActive ? variantStyle.active : variantStyle.inactive,
                color: isActive ? variantStyle.activeColor : variantStyle.inactiveColor,
                border: `1px solid ${isActive ? variantStyle.activeColor + '50' : 'rgba(75, 85, 99, 0.3)'}`,
                borderRadius: 6,
                fontSize: sizeStyle.fontSize,
                fontWeight: 600,
                cursor: disabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                opacity: disabled ? 0.5 : 1,
                transition: 'all 0.2s ease',
                minWidth: size === 'small' ? 28 : size === 'large' ? 44 : 36
            }}
        >
            <Icon size={sizeStyle.iconSize} />
            {size === 'large' && <span>{label}</span>}
        </button>
    );
};

// Toolbar Section Component
const ToolbarSection = ({ title, children, collapsible = false }) => {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div style={{
            background: 'rgba(2, 6, 23, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 8,
            padding: 8,
            backdropFilter: 'blur(12px)'
        }}>
            {title && (
                <div
                    style={{
                        fontSize: 10,
                        color: '#64748b',
                        marginBottom: 8,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: collapsible ? 'pointer' : 'default'
                    }}
                    onClick={collapsible ? () => setCollapsed(!collapsed) : undefined}
                >
                    {title}
                    {collapsible && (
                        <span style={{
                            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease'
                        }}>
                             
                        </span>
                    )}
                </div>
            )}
            {!collapsed && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {children}
                </div>
            )}
        </div>
    );
};

// Main Enhanced Survey Toolbar
const EnhancedSurveyToolbar = () => {
    const {
        viewMode,
        activeTool,
        measurementMode,
        showMeasurements,
        sunSimulation,
        rendering,
        boundaries,  // Use boundaries instead of areas
        panels,
        setViewMode,
        setActiveTool,
        setMeasurementMode,
        setShowMeasurements,
        updateSunSimulation,  // Use proper method name
        setRendering,  // Use proper method name
        exportDesign,
        importDesign,
        calculateAnalysis
    } = useSolarSurveyStore();

    // Import/Export handlers
    const handleExport = () => {
        const design = exportDesign();
        const blob = new Blob([JSON.stringify(design, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `solar-design-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const design = JSON.parse(e.target.result);
                        importDesign(design);
                    } catch (error) {
                        alert('Invalid design file');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    return (
        <div style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 12,
            zIndex: 20,
            maxWidth: '90vw',
            overflowX: 'auto',
            padding: '0 16px'
        }}>
            {/* View Mode Controls */}
            <ToolbarSection title="View Mode">
                <ToolButton
                    icon={Map}
                    label="3D Map"
                    isActive={viewMode === '2D'}
                    onClick={() => setViewMode('2D')}
                    size="large"
                />
                <ToolButton
                    icon={Box}
                    label="3D Scene"
                    isActive={viewMode === '3D'}
                    onClick={() => setViewMode('3D')}
                    size="large"
                />
                <ToolButton
                    icon={Layers}
                    label="Split View"
                    isActive={viewMode === 'SPLIT'}
                    onClick={() => setViewMode('SPLIT')}
                    size="large"
                />
                <ToolButton
                    icon={Maximize2}
                    label="Overview"
                    isActive={viewMode === 'OVERVIEW'}
                    onClick={() => setViewMode('OVERVIEW')}
                    size="large"
                />
            </ToolbarSection>

            {/* 3D Drawing Tools - Available in all modes */}
            <ToolbarSection title="3D Drawing Tools">
                <ToolButton
                    icon={MousePointer}
                    label="Select"
                    isActive={activeTool === 'select'}
                    onClick={() => setActiveTool(activeTool === 'select' ? null : 'select')}
                />
                <ToolButton
                    icon={Shapes}
                    label="Draw Area"
                    isActive={activeTool === 'draw-area'}
                    onClick={() => setActiveTool(activeTool === 'draw-area' ? null : 'draw-area')}
                    variant="success"
                />
                <ToolButton
                    icon={Square}
                    label="Rectangle"
                    isActive={activeTool === 'draw-rectangle'}
                    onClick={() => setActiveTool(activeTool === 'draw-rectangle' ? null : 'draw-rectangle')}
                    variant="success"
                />
                <ToolButton
                    icon={Circle}
                    label="Exclude Area"
                    isActive={activeTool === 'exclude-area'}
                    onClick={() => setActiveTool(activeTool === 'exclude-area' ? null : 'exclude-area')}
                    variant="danger"
                />
            </ToolbarSection>

            {/* 3D Navigation Tools */}
            <ToolbarSection title="3D Navigation">
                <ToolButton
                    icon={Move3D}
                    label="Navigate"
                    isActive={activeTool === 'navigate'}
                    onClick={() => setActiveTool(activeTool === 'navigate' ? null : 'navigate')}
                />
                <ToolButton
                    icon={Zap}
                    label="Panel Tool"
                    isActive={activeTool === 'panel-tool'}
                    onClick={() => setActiveTool(activeTool === 'panel-tool' ? null : 'panel-tool')}
                    variant="success"
                    disabled={boundaries.length === 0}
                />
                <ToolButton
                    icon={Ruler}
                    label="Measure"
                    isActive={measurementMode}
                    onClick={() => setMeasurementMode(!measurementMode)}
                    variant="warning"
                />
                <ToolButton
                    icon={showMeasurements ? Eye : EyeOff}
                    label="Show Measurements"
                    isActive={showMeasurements}
                    onClick={() => setShowMeasurements(!showMeasurements)}
                />
            </ToolbarSection>
            )}

            {/* Simulation Controls */}
            <ToolbarSection title="Simulation">
                <ToolButton
                    icon={Sun}
                    label="Sun Simulation"
                    isActive={sunSimulation.enabled}
                    onClick={() => updateSunSimulation({
                        enabled: !sunSimulation.enabled
                    })}
                    variant="warning"
                />
                <ToolButton
                    icon={Grid3X3}
                    label="Shadows"
                    isActive={rendering.shadows}
                    onClick={() => setRendering({
                        shadows: !rendering.shadows
                    })}
                />
            </ToolbarSection>

            {/* Quick Actions */}
            <ToolbarSection title="Actions">
                <ToolButton
                    icon={RotateCcw}
                    label="Reset View"
                    onClick={() => {
                        // Reset camera position
                        setViewMode(viewMode);
                    }}
                />
                <ToolButton
                    icon={Settings}
                    label="Calculate"
                    onClick={calculateAnalysis}
                    variant="success"
                    disabled={panels.length === 0}
                />
                <ToolButton
                    icon={Download}
                    label="Export"
                    onClick={handleExport}
                    disabled={boundaries.length === 0}
                />
                <ToolButton
                    icon={Upload}
                    label="Import"
                    onClick={handleImport}
                />
            </ToolbarSection>

            {/* Performance Stats */}
            {panels.length > 0 && (
                <ToolbarSection title="Stats">
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        minWidth: 100
                    }}>
                        <div style={{
                            fontSize: 10,
                            color: '#64748b',
                            display: 'flex',
                            justifyContent: 'space-between'
                        }}>
                            <span>Panels:</span>
                            <span style={{ color: '#f1f5f9', fontWeight: 600 }}>
                                {panels.length}
                            </span>
                        </div>
                        <div style={{
                            fontSize: 10,
                            color: '#64748b',
                            display: 'flex',
                            justifyContent: 'space-between'
                        }}>
                            <span>Areas:</span>
                            <span style={{ color: '#f1f5f9', fontWeight: 600 }}>
                                {boundaries.length}
                            </span>
                        </div>
                    </div>
                </ToolbarSection>
            )}
        </div>
    );
};

export default EnhancedSurveyToolbar;

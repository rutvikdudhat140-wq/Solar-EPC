// EnhancedSolarSurveyStudio.js   Main orchestrator with Full 3D Map integration
import React, { useState, useEffect, useCallback } from 'react';
import { useSolarSurveyStore } from './useSolarSurveyStore';
import Enhanced3DScene from './Enhanced3DScene';
import EnhancedMapView from './EnhancedMapView';
import Full3DMapView from './Full3DMapView'; // Import the new Full 3D Map
import SmartPanelPlacement from './SmartPanelPlacement';
import EnhancedSurveyToolbar from './EnhancedSurveyToolbar';
import MeasurementTool from './MeasurementTool';
import QuickStartGuide from './QuickStartGuide';
import SurveyLeftSidebar from './SurveyLeftSidebar';
import SurveyRightPanel from './SurveyRightPanel';
import SurveyBottomBar from './SurveyBottomBar';

// View Mode Switcher Component
const ViewModeSwitcher = ({ currentMode, onModeChange, isTransitioning }) => {
    const modes = [
        { id: '2D', label: '2D Map', icon: '   ', description: 'Satellite view with drawing tools' },
        { id: '3D', label: '3D View', icon: '   ', description: 'Interactive 3D visualization' },
        { id: 'SPLIT', label: 'Split View', icon: '  ', description: 'Side-by-side 2D and 3D' },
        { id: 'OVERVIEW', label: 'Overview', icon: '   ', description: 'Bird\'s eye view analysis' }
    ];

    return (
        <div style={{
            display: 'flex',
            background: 'rgba(2, 6, 23, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 12,
            padding: 4,
            backdropFilter: 'blur(12px)',
            gap: 2
        }}>
            {modes.map(mode => (
                <button
                    key={mode.id}
                    onClick={() => !isTransitioning && onModeChange(mode.id)}
                    disabled={isTransitioning}
                    title={mode.description}
                    style={{
                        padding: '8px 12px',
                        background: currentMode === mode.id
                            ? 'rgba(59, 130, 246, 0.3)'
                            : 'transparent',
                        color: currentMode === mode.id ? '#3b82f6' : '#94a3b8',
                        border: currentMode === mode.id
                            ? '1px solid rgba(59, 130, 246, 0.3)'
                            : '1px solid transparent',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: isTransitioning ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        opacity: isTransitioning ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        minWidth: 80
                    }}
                >
                    <span style={{ fontSize: 14 }}>{mode.icon}</span>
                    <span>{mode.label}</span>
                </button>
            ))}
        </div>
    );
};

// Enhanced Stats HUD
const EnhancedStatsHUD = () => {
    const { analysis, panels, boundaries, sunSimulation } = useSolarSurveyStore();

    if (boundaries.length === 0) return null;

    const stats = [
        {
            label: 'Areas',
            value: boundaries.length,
            color: '#3b82f6',
            unit: ''
        },
        {
            label: 'Panels',
            value: analysis.totalPanels || 0,
            color: '#f1f5f9',
            unit: ''
        },
        {
            label: 'Capacity',
            value: analysis.totalCapacityKW || 0,
            color: '#f59e0b',
            unit: 'kWp'
        },
        {
            label: 'Annual Output',
            value: ((analysis.estimatedAnnualKWh || 0) / 1000).toFixed(1),
            color: '#22c55e',
            unit: 'MWh'
        },
        {
            label: 'Coverage',
            value: (analysis.coverage || 0).toFixed(1),
            color: '#8b5cf6',
            unit: '%'
        }
    ];

    if (sunSimulation.enabled && analysis.shadedPanels > 0) {
        stats.push({
            label: 'Shaded',
            value: analysis.shadedPanels,
            color: '#ef4444',
            unit: ''
        });
    }

    return (
        <div style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            background: 'rgba(2, 6, 23, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 12,
            padding: '16px 20px',
            backdropFilter: 'blur(12px)',
            minWidth: 200,
            maxWidth: 320,
            zIndex: 15,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
            <div style={{
                fontSize: 11,
                color: '#64748b',
                marginBottom: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                gap: 6
            }}>
                   Survey Statistics
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                gap: 12
            }}>
                {stats.map((stat, index) => (
                    <div key={index} style={{ textAlign: 'center' }}>
                        <div style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: stat.color,
                            fontFamily: 'monospace',
                            marginBottom: 2
                        }}>
                            {stat.value}{stat.unit}
                        </div>
                        <div style={{
                            fontSize: 10,
                            color: '#64748b',
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em'
                        }}>
                            {stat.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                gap: 8
            }}>
                <button style={{
                    flex: 1,
                    padding: '6px 12px',
                    background: 'rgba(34, 197, 94, 0.2)',
                    color: '#22c55e',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer'
                }}>
                       Export Report
                </button>
                <button style={{
                    flex: 1,
                    padding: '6px 12px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: '#3b82f6',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer'
                }}>
                       Save Design
                </button>
            </div>
        </div>
    );
};

// Navigation Compass Component
const NavigationCompass = ({ onResetView }) => {
    return (
        <div style={{
            position: 'absolute',
            top: 20,
            right: 20,
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'rgba(2, 6, 23, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 15,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(12px)',
            cursor: 'pointer'
        }}
            onClick={onResetView}
            title="Reset view orientation"
        >
            <svg width="32" height="32" viewBox="0 0 32 32">
                <defs>
                    <linearGradient id="northGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="1" />
                        <stop offset="100%" stopColor="#dc2626" stopOpacity="1" />
                    </linearGradient>
                    <linearGradient id="southGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.6" />
                    </linearGradient>
                </defs>

                {/* North Arrow */}
                <polygon
                    points="16,4 20,14 16,12 12,14"
                    fill="url(#northGradient)"
                    stroke="#ffffff"
                    strokeWidth="0.5"
                />

                {/* South Arrow */}
                <polygon
                    points="16,28 12,18 16,20 20,18"
                    fill="url(#southGradient)"
                    stroke="#64748b"
                    strokeWidth="0.5"
                />

                {/* Center Dot */}
                <circle cx="16" cy="16" r="2" fill="#3b82f6" opacity="0.8" />

                {/* Cardinal Direction Labels */}
                <text x="16" y="8" textAnchor="middle" fontSize="8" fill="#ef4444" fontWeight="700">N</text>
                <text x="24" y="18" textAnchor="middle" fontSize="6" fill="#64748b" fontWeight="500">E</text>
                <text x="16" y="28" textAnchor="middle" fontSize="6" fill="#64748b" fontWeight="500">S</text>
                <text x="8" y="18" textAnchor="middle" fontSize="6" fill="#64748b" fontWeight="500">W</text>
            </svg>
        </div>
    );
};

// Main Enhanced Solar Survey Studio Component
const EnhancedSolarSurveyStudio = () => {
    const {
        viewMode,
        setViewMode,
        boundaries,
        analysis,
        initializeStore,
        calculateAnalysis
    } = useSolarSurveyStore();

    const [isTransitioning, setIsTransitioning] = useState(false);
    const [showIntro, setShowIntro] = useState(true);
    const [showQuickStart, setShowQuickStart] = useState(false);

    // Initialize store on mount
    useEffect(() => {
        initializeStore();

        // Hide intro after 3 seconds or when user starts interacting
        const introTimer = setTimeout(() => {
            setShowIntro(false);
        }, 3000);

        return () => clearTimeout(introTimer);
    }, [initializeStore]);

    // Recalculate analysis when data changes
    useEffect(() => {
        calculateAnalysis();
    }, [calculateAnalysis]);

    // Handle view mode changes with smooth transitions
    const handleViewModeChange = useCallback((newMode) => {
        if (isTransitioning || newMode === viewMode) return;

        setIsTransitioning(true);

        // Transition animation
        setTimeout(() => {
            setViewMode(newMode);
            setTimeout(() => {
                setIsTransitioning(false);
            }, 300);
        }, 200);
    }, [viewMode, isTransitioning, setViewMode]);

    // Handle transition from 2D to 3D (called from map component)
    const handleTransitionTo3D = useCallback(() => {
        handleViewModeChange('3D');
    }, [handleViewModeChange]);

    // Reset view to default
    const handleResetView = useCallback(() => {
        // Reset camera position and orientation
        setViewMode(viewMode); // Trigger camera reset
    }, [viewMode, setViewMode]);

    // Dismiss intro on any interaction
    const handleUserInteraction = useCallback(() => {
        if (showIntro) {
            setShowIntro(false);
        }
    }, [showIntro]);

    // Render different view modes with Full 3D Map integration
    const renderMainContent = () => {
        switch (viewMode) {
            case '2D':
                // Use Full 3D Map for better experience when Google Maps unavailable
                return (
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        <Full3DMapView />
                        <div style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            background: 'rgba(59, 130, 246, 0.9)',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            zIndex: 20
                        }}>
                            3D Map Mode   Full Zoom Enabled
                        </div>
                    </div>
                );
            case '3D':
                return <Enhanced3DScene />;
            case 'SPLIT':
                return (
                    <div style={{
                        display: 'flex',
                        width: '100%',
                        height: '100%',
                        gap: 2
                    }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <Full3DMapView />
                        </div>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <Enhanced3DScene />
                        </div>
                    </div>
                );
            case 'OVERVIEW':
                return (
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        <Full3DMapView />
                        <div style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            background: 'rgba(16, 185, 129, 0.9)',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            zIndex: 20
                        }}>
                            Overview Mode   Full 3D Environment
                        </div>
                    </div>
                );
            default:
                return <Full3DMapView />;
        }
    };

    return (
        <div
            style={{
                width: '100vw',
                height: '100vh',
                position: 'relative',
                background: 'linear-gradient(135deg, #0c1426 0%, #1e293b 100%)',
                overflow: 'hidden'
            }}
            onClick={handleUserInteraction}
            onKeyDown={handleUserInteraction}
        >
            {/* Enhanced Toolbar */}
            <EnhancedSurveyToolbar />

            {/* Measurement Tool */}
            <MeasurementTool show={viewMode !== '2D'} />

            {/* Left Sidebar - Tools & Controls */}
            <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 320,
                zIndex: 10,
                pointerEvents: 'none'
            }}>
                <div style={{ pointerEvents: 'auto', height: '100%' }}>
                    <SurveyLeftSidebar />
                    {viewMode !== '2D' && <SmartPanelPlacement />}
                </div>
            </div>

            {/* Right Panel - Properties & Analysis */}
            <div style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: 300,
                zIndex: 10,
                pointerEvents: 'none'
            }}>
                <div style={{ pointerEvents: 'auto', height: '100%' }}>
                    <SurveyRightPanel />
                </div>
            </div>

            {/* Bottom Bar - Status & Quick Actions */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 320,
                right: 300,
                height: 80,
                zIndex: 10,
                pointerEvents: 'none'
            }}>
                <div style={{ pointerEvents: 'auto', height: '100%' }}>
                    <SurveyBottomBar />
                </div>
            </div>

            {/* Main Content Area */}
            <div
                style={{
                    position: 'absolute',
                    left: 320,
                    top: 0,
                    right: 300,
                    bottom: 80,
                    transition: `opacity ${isTransitioning ? 300 : 0}ms ease-in-out`,
                    opacity: isTransitioning ? 0.7 : 1
                }}
            >
                {renderMainContent()}
            </div>

            {/* Navigation Compass */}
            <NavigationCompass onResetView={handleResetView} />

            {/* Enhanced Statistics HUD */}
            <EnhancedStatsHUD />

            {/* Introduction Overlay */}
            {showIntro && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 30,
                    animation: 'fadeIn 0.5s ease-in-out'
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(2, 6, 23, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: 20,
                        padding: '40px 48px',
                        backdropFilter: 'blur(20px)',
                        textAlign: 'center',
                        maxWidth: 480,
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)'
                    }}>
                        <div style={{ fontSize: 64, marginBottom: 20 }}>  </div>
                        <h1 style={{
                            color: '#f1f5f9',
                            fontSize: 24,
                            fontWeight: 700,
                            marginBottom: 12,
                            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            Enhanced Solar Survey Studio
                        </h1>
                        <p style={{
                            color: '#94a3b8',
                            fontSize: 14,
                            lineHeight: 1.6,
                            marginBottom: 24,
                            maxWidth: 400
                        }}>
                            Design and analyze solar installations with intelligent 2D/3D visualization,
                            smart panel placement, and real-time performance analysis.
                        </p>
                        <div style={{
                            display: 'flex',
                            gap: 20,
                            justifyContent: 'center',
                            fontSize: 13,
                            color: '#64748b'
                        }}>
                            <div>    Interactive Maps</div>
                            <div>   AI Panel Placement</div>
                            <div>   Live Analysis</div>
                        </div>
                        <button
                            onClick={() => setShowIntro(false)}
                            style={{
                                marginTop: 32,
                                padding: '12px 32px',
                                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 25,
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: 'pointer',
                                boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
                                marginRight: 12
                            }}
                        >
                               Start Survey
                        </button>
                        <button
                            onClick={() => {
                                setShowIntro(false);
                                setShowQuickStart(true);
                            }}
                            style={{
                                marginTop: 32,
                                padding: '12px 32px',
                                background: 'rgba(55, 65, 81, 0.3)',
                                color: '#f1f5f9',
                                border: '1px solid rgba(75, 85, 99, 0.3)',
                                borderRadius: 25,
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                               Quick Guide
                        </button>
                    </div>
                </div>
            )}

            {/* Transition Overlay */}
            {isTransitioning && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 320,
                    right: 300,
                    bottom: 80,
                    background: 'rgba(0, 0, 0, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 25
                }}>
                    <div style={{
                        background: 'rgba(2, 6, 23, 0.95)',
                        padding: '16px 32px',
                        borderRadius: 12,
                        backdropFilter: 'blur(12px)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: 24, marginBottom: 8 }}> </div>
                        <div style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600 }}>
                            Switching View Mode...
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Start Guide */}
            <QuickStartGuide
                show={showQuickStart}
                onClose={() => setShowQuickStart(false)}
            />

            {/* CSS Animations */}
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default EnhancedSolarSurveyStudio;

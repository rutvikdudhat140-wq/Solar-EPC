// SolarSurveyStudio.js   Main Solar Survey Design System orchestrator
// Full-screen studio: Map 2D + 3D + drawing tools + panel auto-fill + shadow analysis
import React, { useEffect } from 'react';
import SurveyMap from './SurveyMap';
import Survey3DScene from './Survey3DScene';
import SurveyToolbar from './SurveyToolbar';
import SurveyLeftSidebar from './SurveyLeftSidebar';
import SurveyRightPanel from './SurveyRightPanel';
import SurveyBottomBar from './SurveyBottomBar';
import { useSolarSurveyStore } from './useSolarSurveyStore';

//    Compass Rose                                                               
const CompassRose = () => (
    <div style={{
        position: 'absolute', top: 12, right: 12,
        width: 44, height: 44, borderRadius: '50%',
        background: 'rgba(2,6,23,0.85)',
        border: '1px solid rgba(255,255,255,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 5, boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(8px)',
    }}>
        <svg width="28" height="28" viewBox="0 0 28 28">
            <polygon points="14,2 17,12 14,10 11,12" fill="#ef4444" opacity="0.9" />
            <polygon points="14,26 11,16 14,18 17,16" fill="#e2e8f0" opacity="0.5" />
            <text x="14" y="7" textAnchor="middle" fontSize="6" fill="#ef4444" fontWeight="700">N</text>
        </svg>
    </div>
);

//    Mini Stats HUD                                                             
const StatsHUD = () => {
    const { analysis, panels, sunSimulation } = useSolarSurveyStore();
    if (panels.length === 0) return null;

    return (
        <div style={{
            position: 'absolute', bottom: 16, right: 16,
            background: 'rgba(2,6,23,0.92)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: '10px 14px',
            backdropFilter: 'blur(10px)', zIndex: 5,
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            minWidth: 180,
        }}>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Quick Stats
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 11 }}>
                <span style={{ color: '#64748b' }}>Panels</span>
                <span style={{ color: '#f1f5f9', fontWeight: 700, textAlign: 'right', fontFamily: 'monospace' }}>
                    {analysis.totalPanels}
                </span>
                <span style={{ color: '#64748b' }}>Capacity</span>
                <span style={{ color: '#f59e0b', fontWeight: 700, textAlign: 'right', fontFamily: 'monospace' }}>
                    {analysis.totalCapacityKW} kWp
                </span>
                <span style={{ color: '#64748b' }}>Annual</span>
                <span style={{ color: '#22c55e', fontWeight: 700, textAlign: 'right', fontFamily: 'monospace' }}>
                    {(analysis.estimatedAnnualKWh / 1000).toFixed(1)} MWh
                </span>
                {sunSimulation.enabled && (
                    <>
                        <span style={{ color: '#64748b' }}>Shaded</span>
                        <span style={{ color: analysis.shadedPanels > 0 ? '#f59e0b' : '#22c55e', fontWeight: 700, textAlign: 'right', fontFamily: 'monospace' }}>
                            {analysis.shadedPanels}
                        </span>
                    </>
                )}
            </div>
        </div>
    );
};

//    Empty State                                                                
const EmptyState3D = () => (
    <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center', pointerEvents: 'none', zIndex: 5,
    }}>
        <div style={{
            background: 'rgba(2,6,23,0.92)',
            border: '1px solid rgba(59,130,246,0.15)',
            borderRadius: 16, padding: '28px 36px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>   </div>
            <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                No Areas Defined Yet
            </p>
            <p style={{ color: '#64748b', fontSize: 12, lineHeight: 1.6, maxWidth: 280 }}>
                Switch to <strong style={{ color: 'var(--primary, #3b82f6)' }}>2D Map View</strong> and use the{' '}
                <strong style={{ color: 'var(--primary, #3b82f6)' }}>Draw Area</strong> tool to outline
                roof boundaries on the satellite map.
            </p>
        </div>
    </div>
);

//                                                                               
// MAIN COMPONENT
//                                                                               
const SolarSurveyStudio = ({ onClose, projectName, initialLat, initialLng }) => {
    const { viewMode, reset, boundaries, setMapCenter } = useSolarSurveyStore();

    // Initialize
    useEffect(() => {
        reset();
        if (initialLat && initialLng) {
            setMapCenter({ lat: initialLat, lng: initialLng });
        }
    }, []); // eslint-disable-line

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            const store = useSolarSurveyStore.getState();
            switch (e.key.toLowerCase()) {
                case 'v': store.setActiveTool('select'); break;
                case 'd': store.setActiveTool('drawBoundary'); break;
                case 'e': store.setActiveTool('drawExclusion'); break;
                case 'm': store.setActiveTool('measure'); break;
                case 'escape':
                    store.setActiveTool('select');
                    store.clearMeasure();
                    break;
                case 'z':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        if (e.shiftKey) store.redo();
                        else store.undo();
                    }
                    break;
                default: break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const renderViewport = () => {
        if (viewMode === '3d') {
            return (
                <div style={{ flex: 1, position: 'relative' }}>
                    <Survey3DScene />
                    {boundaries.length === 0 && <EmptyState3D />}
                    <CompassRose />
                    <StatsHUD />
                </div>
            );
        }

        if (viewMode === 'split') {
            return (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1, position: 'relative', borderBottom: '2px solid rgba(255,255,255,0.08)' }}>
                        <SurveyMap />
                        <StatsHUD />
                    </div>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Survey3DScene />
                        <CompassRose />
                    </div>
                </div>
            );
        }

        // 2D map (default)
        return (
            <div style={{ flex: 1, position: 'relative' }}>
                <SurveyMap />
                <CompassRose />
                <StatsHUD />
            </div>
        );
    };

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: '#020617',
            display: 'flex', flexDirection: 'column',
            zIndex: 9999,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}>
            {/* Top Toolbar */}
            <SurveyToolbar projectName={projectName} onClose={onClose} />

            {/* Main Body */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                {/* Left sidebar */}
                <SurveyLeftSidebar />

                {/* Viewport */}
                {renderViewport()}

                {/* Right panel */}
                <SurveyRightPanel />
            </div>

            {/* Bottom Bar */}
            <SurveyBottomBar />
        </div>
    );
};

export default SolarSurveyStudio;

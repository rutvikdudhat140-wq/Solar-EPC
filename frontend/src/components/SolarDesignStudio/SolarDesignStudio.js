// SolarDesignStudio.js   Full-screen design studio modal/page
// Integrates: Three.js 3D scene + LIVE Google Maps 2D + Arka360-style UI
import React, { useState, useEffect } from 'react';
import Scene3D from './Scene3D';
import Map2D from './Map2D';
import Map2DEnhanced from './Map2DEnhanced';
import Map2DIframe from './Map2DIframe'; // NEW: Simple iframe version (no API key needed!)
import LeftSidebar from './LeftSidebar';
import RightPanel from './RightPanel';
import StudioToolbar from './StudioToolbar';
import BottomBar from './BottomBar';
import { useSolarStore } from './useSolarStore';

const WarningBadge = () => (
    <div style={{
        position: 'absolute', top: 16, right: 300,
        width: 36, height: 36, borderRadius: '50%',
        background: 'rgba(245,158,11,0.15)',
        border: '2px solid rgba(245,158,11,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', zIndex: 5, fontSize: 18,
        boxShadow: '0 0 12px rgba(245,158,11,0.3)',
    }}>
          
    </div>
);

const CompassRose = () => (
    <div style={{
        position: 'absolute', top: 16, right: 16,
        width: 40, height: 40, borderRadius: '50%',
        background: 'rgba(2,6,23,0.85)',
        border: '1px solid rgba(255,255,255,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, cursor: 'pointer', zIndex: 5,
        boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
    }}>
          
    </div>
);

const ChatBtn = () => (
    <div style={{
        position: 'absolute', bottom: 70, right: 16,
        width: 40, height: 40, borderRadius: '50%',
        background: '#1e293b',
        border: '1px solid rgba(255,255,255,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, cursor: 'pointer', zIndex: 5,
        boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
    }}>
          
    </div>
);

const SolarDesignStudio = ({ onClose, projectName, designName, initialLat, initialLng }) => {
    const [viewMode, setViewMode] = useState('3d');   // '2d' | '3d'
    const [mapType, setMapType] = useState('google');
    const [solar3D, setSolar3D] = useState(false);
    const { reset, roofs } = useSolarStore();

    // Reset store when studio opens
    useEffect(() => {
        reset();
        // Pre-add a default roof so user sees something immediately
        useSolarStore.getState().addRoof({
            label: 'Roof 1',
            x: 0, z: 0,
            width: 20, depth: 12,
        });
    }, []); // eslint-disable-line

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: '#020617',
            display: 'flex', flexDirection: 'column',
            zIndex: 9999,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}>
            {/*    Top Toolbar                                                     */}
            <StudioToolbar
                projectName={projectName}
                designName={designName}
                onClose={onClose}
                viewMode={viewMode}
                setViewMode={setViewMode}
            />

            {/*    Main Body                                                       */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

                {/* Left sidebar tools */}
                <LeftSidebar />

                {/* Viewport */}
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

                    {viewMode === '3d' ? (
                        <Scene3D />
                    ) : (
                        <Map2DIframe
                            lat={initialLat || 21.1702}
                            lng={initialLng || 72.8311}
                        />
                    )}

                    {/* Floating overlays */}
                    <CompassRose />
                    <WarningBadge />
                    <ChatBtn />

                    {/* Bottom map controls */}
                    <BottomBar
                        mapType={mapType}
                        setMapType={setMapType}
                        solar3D={solar3D}
                        setSolar3D={setSolar3D}
                    />

                    {/* 3D hint when no roofs */}
                    {roofs.length === 0 && viewMode === '3d' && (
                        <div style={{
                            position: 'absolute', top: '50%', left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center', pointerEvents: 'none',
                            zIndex: 5,
                        }}>
                            <div style={{
                                background: 'rgba(2,6,23,0.9)',
                                border: '1px solid rgba(59,130,246,0.2)',
                                borderRadius: 16, padding: '24px 32px',
                                backdropFilter: 'blur(12px)',
                            }}>
                                <div style={{ fontSize: 40, marginBottom: 10 }}>   </div>
                                <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
                                    Solar Design Studio Ready
                                </p>
                                <p style={{ color: '#64748b', fontSize: 12, lineHeight: 1.6 }}>
                                    Use <strong style={{ color: '#3b82f6' }}>  Draw Roof</strong> tool to draw a roof polygon<br />
                                    or click <strong style={{ color: '#3b82f6' }}>+ Add New Roof Model</strong> in the right panel
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right properties panel */}
                <RightPanel projectName={projectName} designName={designName} />
            </div>
        </div>
    );
};

export default SolarDesignStudio;

// SurveyBottomBar.js   Bottom status bar + map type controls
import React from 'react';
import { useSolarSurveyStore } from './useSolarSurveyStore';
import { Map, Satellite, Layers, ZoomIn, ZoomOut } from 'lucide-react';

const SurveyBottomBar = () => {
    const {
        mapCenter, mapZoom, mapType, setMapType,
        setMapZoom, boundaries, panels, analysis,
        measureDistance, activeTool,
    } = useSolarSurveyStore();

    const mapTypes = [
        { id: 'satellite', icon: Satellite, label: 'Satellite' },
        { id: 'hybrid', icon: Layers, label: 'Hybrid' },
        { id: 'roadmap', icon: Map, label: 'Map' },
    ];

    return (
        <div style={{
            height: 36,
            background: 'rgba(2,6,23,0.98)',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 14px', flexShrink: 0, zIndex: 20,
        }}>
            {/* Left: Status info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 10, color: '#64748b' }}>
                <span style={{ fontFamily: 'monospace' }}>
                       {mapCenter.lat.toFixed(5)}, {mapCenter.lng.toFixed(5)}
                </span>
                <span>   Z{mapZoom}</span>
                <span style={{ color: '#94a3b8' }}>
                    {boundaries.length} area{boundaries.length !== 1 ? 's' : ''}   {panels.length} panels   {analysis.totalCapacityKW} kWp
                </span>
                {activeTool === 'measure' && measureDistance > 0 && (
                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                           {measureDistance.toFixed(2)} m
                    </span>
                )}
            </div>

            {/* Center: Map type selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {mapTypes.map(mt => {
                    const isActive = mapType === mt.id;
                    return (
                        <button
                            key={mt.id}
                            onClick={() => setMapType(mt.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                padding: '3px 10px', borderRadius: 4,
                                border: isActive ? '1px solid rgba(59,130,246,0.5)' : '1px solid transparent',
                                background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
                                color: isActive ? '#60a5fa' : '#64748b',
                                fontSize: 10, fontWeight: 600, cursor: 'pointer',
                                transition: 'all 0.15s',
                            }}
                        >
                            <mt.icon size={11} />
                            {mt.label}
                        </button>
                    );
                })}
            </div>

            {/* Right: Zoom controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button onClick={() => setMapZoom(Math.min(22, mapZoom + 1))}
                    style={{
                        width: 24, height: 24, borderRadius: 4,
                        border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
                        color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                    <ZoomIn size={12} />
                </button>
                <button onClick={() => setMapZoom(Math.max(10, mapZoom - 1))}
                    style={{
                        width: 24, height: 24, borderRadius: 4,
                        border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
                        color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                    <ZoomOut size={12} />
                </button>
            </div>
        </div>
    );
};

export default SurveyBottomBar;

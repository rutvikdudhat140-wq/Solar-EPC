// StudioToolbar.js   Top toolbar with breadcrumb, undo/redo, save/export, 2D/3D toggle
import React from 'react';
import { useSolarStore } from './useSolarStore';

const IconBtn = ({ icon, title, onClick, color, active }) => (
    <button
        title={title}
        onClick={onClick}
        style={{
            width: 32, height: 32, borderRadius: 8,
            border: active ? '1px solid rgba(59,130,246,0.6)' : '1px solid transparent',
            background: active ? 'rgba(37,99,235,0.2)' : 'transparent',
            color: color || (active ? '#3b82f6' : '#94a3b8'),
            fontSize: 15, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = active ? 'rgba(37,99,235,0.3)' : 'rgba(255,255,255,0.07)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = active ? 'rgba(37,99,235,0.2)' : 'transparent'; }}
    >
        {icon}
    </button>
);

const Divider = () => (
    <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />
);

const StudioToolbar = ({ projectName, designName, onClose, viewMode, setViewMode }) => {
    const handleSave = () => {
        const state = useSolarStore.getState();
        const data = {
            projectName, designName,
            roofs: state.roofs,
            panels: state.panels,
            obstacles: state.obstacles,
            panelSettings: state.panelSettings,
            roofSettings: state.roofSettings,
            solarAnalysis: state.solarAnalysis,
            sunSimulation: state.sunSimulation,
            viewSettings: state.viewSettings,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `${projectName || 'solar-design'}.json`; a.click();
    };

    return (
        <div style={{
            height: 50,
            background: 'rgba(2,6,23,0.98)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            flexShrink: 0,
            zIndex: 20,
        }}>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
                <span style={{ cursor: 'pointer', color: '#94a3b8' }} onClick={onClose}>Home</span>
                <span> </span>
                <span style={{ cursor: 'pointer', color: '#94a3b8' }} onClick={onClose}>Lead Summary</span>
                <span> </span>
                <span style={{ color: '#f1f5f9', fontWeight: 600 }}>Design</span>
            </div>

            {/* Center   undo / redo / save / close / export */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconBtn icon=" " title="Undo (Ctrl+Z)" />
                <IconBtn icon=" " title="Redo (Ctrl+Y)" />
                <Divider />
                <IconBtn icon=" " title="Save" color="#22c55e" onClick={handleSave} />
                <IconBtn icon=" " title="Close" color="#ef4444" onClick={onClose} />
                <Divider />
                <IconBtn icon="  " title="Save Design JSON" onClick={handleSave} />
                <IconBtn icon=" " title="Export" onClick={handleSave} />
                <Divider />
                {/* 2D / 3D Toggle */}
                <div style={{
                    display: 'flex', borderRadius: 8, overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.1)', marginLeft: 4,
                }}>
                    {['2D', '3D'].map((m) => {
                        // Get primary color from CSS variable
                        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#2563eb';

                        return (
                            <button
                                key={m}
                                onClick={() => setViewMode(m.toLowerCase())}
                                style={{
                                    padding: '4px 14px', fontSize: 11, fontWeight: 700,
                                    border: 'none', cursor: 'pointer',
                                    background: viewMode === m.toLowerCase() ? primaryColor : 'rgba(255,255,255,0.04)',
                                    color: viewMode === m.toLowerCase() ? '#fff' : '#64748b',
                                    transition: 'all 0.15s',
                                }}
                            >
                                {m}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Right   site survey / notifications */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px', borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#94a3b8', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                }}>
                       Site Survey Files
                </button>
                <IconBtn icon="  " title="Notifications" />
                <IconBtn icon="  " title="Settings" />
                <IconBtn icon="  " title="Profile" />
            </div>
        </div>
    );
};

export default StudioToolbar;

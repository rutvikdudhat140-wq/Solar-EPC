// LeftSidebar.js   Tool palette matching Arka360 UI
import React from 'react';
import { useSolarStore } from './useSolarStore';

const tools = [
    { id: 'select', icon: ' ', label: 'Select' },
    { id: 'drawRoof', icon: ' ', label: 'Draw Roof' },
    { id: 'addPanel', icon: ' ', label: 'Add Panels' },
    { id: 'dormer', icon: ' ', label: 'Add Dormer' },
    { id: 'obstacle', icon: '  ', label: 'Obstacle' },
    { id: 'measure', icon: '  ', label: 'Measure' },
];

const LeftSidebar = () => {
    const { activeTool, setActiveTool } = useSolarStore();

    return (
        <div
            style={{
                width: 52,
                background: 'rgba(2,6,23,0.97)',
                borderRight: '1px solid rgba(255,255,255,0.07)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: 8,
                paddingBottom: 8,
                gap: 4,
                zIndex: 10,
            }}
        >
            {tools.map((tool) => {
                const active = activeTool === tool.id;
                return (
                    <button
                        key={tool.id}
                        title={tool.label}
                        onClick={() => setActiveTool(tool.id)}
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: 8,
                            border: active
                                ? '1px solid rgba(59,130,246,0.7)'
                                : '1px solid transparent',
                            background: active
                                ? 'rgba(37,99,235,0.25)'
                                : 'transparent',
                            color: active ? '#3b82f6' : '#64748b',
                            fontSize: 16,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                            if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                        }}
                        onMouseLeave={(e) => {
                            if (!active) e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        {tool.icon}
                    </button>
                );
            })}

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Eye / visibility */}
            <button
                title="Visibility"
                style={{
                    width: 38, height: 38, borderRadius: 8, border: '1px solid transparent',
                    background: 'transparent', color: '#64748b', fontSize: 16, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
            >
                  
            </button>
            <button
                title="Sun Path"
                style={{
                    width: 38, height: 38, borderRadius: 8, border: '1px solid transparent',
                    background: 'transparent', color: '#64748b', fontSize: 16, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
            >
                  
            </button>
        </div>
    );
};

export default LeftSidebar;

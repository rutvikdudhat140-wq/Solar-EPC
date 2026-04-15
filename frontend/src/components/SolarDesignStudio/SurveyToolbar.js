// SurveyToolbar.js   Top toolbar for Solar Survey Design
import React from 'react';
import { useSolarSurveyStore } from './useSolarSurveyStore';
import {
    MousePointer2, Pentagon, Ban, Ruler, Undo2, Redo2,
    Save, Download, X, Sun, Eye, Grid3x3, Tag, Building2
} from 'lucide-react';

const ToolBtn = ({ icon: Icon, label, active, onClick, danger, disabled }) => {
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#3b82f6';
    return (
        <button
            title={label}
            onClick={onClick}
            disabled={disabled}
            style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 6,
                border: active
                    ? `1px solid ${primaryColor}88`
                    : '1px solid transparent',
                background: active
                    ? `${primaryColor}22`
                    : danger ? 'rgba(239,68,68,0.1)' : 'transparent',
                color: active
                    ? primaryColor
                    : danger ? '#ef4444' : disabled ? '#334155' : '#94a3b8',
                fontSize: 11, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                opacity: disabled ? 0.4 : 1,
            }}
            onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = active ? `${primaryColor}33` : 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.background = active ? `${primaryColor}22` : 'transparent'; }}
        >
            <Icon size={14} />
            {label && <span>{label}</span>}
        </button>
    );
};

const Divider = () => (
    <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)', margin: '0 6px' }} />
);

const SurveyToolbar = ({ projectName, onClose }) => {
    const {
        activeTool, setActiveTool, viewMode, setViewMode,
        undo, redo, exportDesign,
        showGrid, toggleShowGrid,
        showShadows, toggleShowShadows,
        showLabels, toggleShowLabels,
        show3DBuildings, toggleShow3DBuildings,
        sunSimulation, toggleSunSimulation,
    } = useSolarSurveyStore();

    const history = useSolarSurveyStore(s => s.history);
    const historyIndex = useSolarSurveyStore(s => s.historyIndex);
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#3b82f6';

    return (
        <div style={{
            height: 52,
            background: 'rgba(2,6,23,0.98)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 12px', flexShrink: 0, zIndex: 30,
        }}>
            {/*    Left: Breadcrumb + Project Name                                   */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}88)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14,
                }}>
                      
                </div>
                <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>
                        Solar Survey Studio
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>
                        {projectName || 'New Project'}   Design
                    </div>
                </div>
            </div>

            {/*    Center: Drawing Tools                                             */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ToolBtn icon={MousePointer2} label="Select" active={activeTool === 'select'}
                    onClick={() => setActiveTool('select')} />
                <ToolBtn icon={Pentagon} label="Draw Area" active={activeTool === 'drawBoundary'}
                    onClick={() => setActiveTool('drawBoundary')} />
                <ToolBtn icon={Ban} label="Exclusion" active={activeTool === 'drawExclusion'}
                    onClick={() => setActiveTool('drawExclusion')} />
                <ToolBtn icon={Ruler} label="Measure" active={activeTool === 'measure'}
                    onClick={() => setActiveTool('measure')} />

                <Divider />

                {/* Undo / Redo */}
                <ToolBtn icon={Undo2} onClick={undo} disabled={!canUndo} />
                <ToolBtn icon={Redo2} onClick={redo} disabled={!canRedo} />

                <Divider />

                {/* View toggles */}
                <ToolBtn icon={Grid3x3} active={showGrid} onClick={toggleShowGrid} />
                <ToolBtn icon={Sun} active={sunSimulation.enabled} onClick={toggleSunSimulation} />
                <ToolBtn icon={Eye} active={showShadows} onClick={toggleShowShadows} />
                <ToolBtn icon={Tag} active={showLabels} onClick={toggleShowLabels} />
                <ToolBtn icon={Building2} active={show3DBuildings} onClick={toggleShow3DBuildings} />

                <Divider />

                {/* 2D / 3D / Split toggle */}
                <div style={{
                    display: 'flex', borderRadius: 8, overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.1)',
                }}>
                    {['2d', '3d', 'split'].map(mode => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            style={{
                                padding: '5px 14px', fontSize: 11, fontWeight: 700,
                                border: 'none', cursor: 'pointer',
                                background: viewMode === mode ? primaryColor : 'rgba(255,255,255,0.04)',
                                color: viewMode === mode ? '#fff' : '#64748b',
                                transition: 'all 0.15s',
                                textTransform: 'uppercase',
                            }}
                        >
                            {mode === 'split' ? '  Split' : mode}
                        </button>
                    ))}
                </div>
            </div>

            {/*    Right: Actions                                                    */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <ToolBtn icon={Save} label="Save" onClick={exportDesign} />
                <ToolBtn icon={Download} label="Export" onClick={exportDesign} />
                <Divider />
                <ToolBtn icon={X} label="Close" danger onClick={onClose} />
            </div>
        </div>
    );
};

export default SurveyToolbar;

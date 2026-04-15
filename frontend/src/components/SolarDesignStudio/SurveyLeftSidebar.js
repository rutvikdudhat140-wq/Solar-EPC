// SurveyLeftSidebar.js   Tool palette + quick actions for survey design
import React, { useState } from 'react';
import { useSolarSurveyStore } from './useSolarSurveyStore';
import {
    MousePointer2, Pentagon, Ban, Ruler, Trash2, Zap, MapPin,
    Layers, Eye, EyeOff, ChevronDown, ChevronRight,
    RotateCcw, Navigation
} from 'lucide-react';

//    Preset Locations                                                           
const presets = [
    { name: 'Surat', lat: 21.1702, lng: 72.8311 },
    { name: 'Delhi NCR', lat: 28.5431, lng: 77.3358 },
    { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
    { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
    { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
    { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
    { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
    { name: 'Pune', lat: 18.5204, lng: 73.8567 },
    { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
    { name: 'Lucknow', lat: 26.8467, lng: 80.9462 },
];

const SectionHeader = ({ title, icon: Icon, open, onToggle, count }) => (
    <button
        onClick={onToggle}
        style={{
            display: 'flex', alignItems: 'center', gap: 6, width: '100%',
            padding: '8px 12px', background: 'none', border: 'none',
            color: '#94a3b8', fontSize: 10, fontWeight: 700, cursor: 'pointer',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
    >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {Icon && <Icon size={12} />}
        {title}
        {count !== undefined && (
            <span style={{
                marginLeft: 'auto', background: 'rgba(59,130,246,0.2)',
                color: '#60a5fa', fontSize: 9, padding: '1px 5px', borderRadius: 4,
            }}>
                {count}
            </span>
        )}
    </button>
);

const SurveyLeftSidebar = () => {
    const {
        activeTool, setActiveTool,
        boundaries, exclusionZones, panels,
        selectedBoundaryId, selectBoundary,
        selectedExclusionId, deleteExclusionZone,
        deleteBoundary, autoFillPanels, clearPanels,
        setMapCenter, setMapZoom,
        mapCenter,
        showExclusions, toggleShowExclusions,
        reset,
    } = useSolarSurveyStore();

    const [openSections, setOpenSections] = useState({
        tools: true,
        location: false,
        areas: true,
        exclusions: true,
    });

    const toggle = (key) => setOpenSections(s => ({ ...s, [key]: !s[key] }));
    const [customLat, setCustomLat] = useState(mapCenter.lat.toFixed(6));
    const [customLng, setCustomLng] = useState(mapCenter.lng.toFixed(6));

    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#3b82f6';

    const tools = [
        { id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
        { id: 'drawBoundary', icon: Pentagon, label: 'Draw Area', shortcut: 'D' },
        { id: 'drawExclusion', icon: Ban, label: 'Exclusion Zone', shortcut: 'E' },
        { id: 'measure', icon: Ruler, label: 'Measure', shortcut: 'M' },
    ];

    const goToLocation = () => {
        const lat = parseFloat(customLat);
        const lng = parseFloat(customLng);
        if (!isNaN(lat) && !isNaN(lng)) {
            setMapCenter({ lat, lng });
            setMapZoom(19);
        }
    };

    return (
        <div style={{
            width: 260,
            background: 'rgba(2,6,23,0.98)',
            borderRight: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', flexDirection: 'column',
            overflowY: 'auto', overflowX: 'hidden',
            fontSize: 12, color: '#e2e8f0', zIndex: 20,
        }}>

            {/*    Drawing Tools                                                     */}
            <SectionHeader title="Drawing Tools" icon={Pentagon} open={openSections.tools} onToggle={() => toggle('tools')} />
            {openSections.tools && (
                <div style={{ padding: '6px 10px 10px' }}>
                    {tools.map(tool => {
                        const isActive = activeTool === tool.id;
                        return (
                            <button
                                key={tool.id}
                                onClick={() => setActiveTool(tool.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                                    padding: '8px 10px', borderRadius: 8,
                                    border: isActive ? `1px solid ${primaryColor}66` : '1px solid transparent',
                                    background: isActive ? `${primaryColor}18` : 'transparent',
                                    color: isActive ? primaryColor : '#94a3b8',
                                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                    transition: 'all 0.15s', marginBottom: 2,
                                    textAlign: 'left',
                                }}
                                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                            >
                                <tool.icon size={15} />
                                <span style={{ flex: 1 }}>{tool.label}</span>
                                <span style={{ fontSize: 9, color: '#475569', fontFamily: 'monospace' }}>{tool.shortcut}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/*    Location Search                                                   */}
            <SectionHeader title="Location" icon={MapPin} open={openSections.location} onToggle={() => toggle('location')} />
            {openSections.location && (
                <div style={{ padding: '6px 10px 10px' }}>
                    {/* Coordinate input */}
                    <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                        <input
                            value={customLat} onChange={e => setCustomLat(e.target.value)}
                            placeholder="Lat" style={{
                                flex: 1, padding: '5px 6px', borderRadius: 4, fontSize: 10,
                                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                                color: '#e2e8f0', fontFamily: 'monospace',
                            }}
                        />
                        <input
                            value={customLng} onChange={e => setCustomLng(e.target.value)}
                            placeholder="Lng" style={{
                                flex: 1, padding: '5px 6px', borderRadius: 4, fontSize: 10,
                                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                                color: '#e2e8f0', fontFamily: 'monospace',
                            }}
                        />
                        <button onClick={goToLocation} style={{
                            padding: '4px 8px', borderRadius: 4, border: '1px solid rgba(34,197,94,0.4)',
                            background: 'rgba(34,197,94,0.15)', color: '#22c55e', cursor: 'pointer', fontSize: 10,
                        }}>
                            <Navigation size={12} />
                        </button>
                    </div>

                    {/* Preset locations */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {presets.map(p => (
                            <button
                                key={p.name}
                                onClick={() => {
                                    setMapCenter({ lat: p.lat, lng: p.lng });
                                    setMapZoom(19);
                                    setCustomLat(p.lat.toFixed(6));
                                    setCustomLng(p.lng.toFixed(6));
                                }}
                                style={{
                                    padding: '3px 8px', borderRadius: 4, fontSize: 9,
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    background: 'rgba(255,255,255,0.03)', color: '#94a3b8',
                                    cursor: 'pointer', fontWeight: 500,
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = `${primaryColor}22`; e.currentTarget.style.color = primaryColor; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#94a3b8'; }}
                            >
                                {p.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/*    Boundary Areas                                                    */}
            <SectionHeader title="Areas" icon={Layers} open={openSections.areas} onToggle={() => toggle('areas')} count={boundaries.length} />
            {openSections.areas && (
                <div style={{ padding: '6px 10px 10px' }}>
                    {boundaries.length === 0 ? (
                        <div style={{
                            padding: '12px 10px', borderRadius: 8,
                            background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)',
                            textAlign: 'center', color: '#475569', fontSize: 11,
                        }}>
                            <Pentagon size={20} style={{ margin: '0 auto 6px', display: 'block', opacity: 0.5 }} />
                            No areas drawn yet.<br />
                            <span style={{ fontSize: 10 }}>Use <strong>Draw Area</strong> tool to start</span>
                        </div>
                    ) : (
                        boundaries.map(b => {
                            const isSelected = selectedBoundaryId === b.id;
                            const bPanels = panels.filter(p => p.boundaryId === b.id);
                            return (
                                <div
                                    key={b.id}
                                    onClick={() => selectBoundary(b.id)}
                                    style={{
                                        padding: '8px 10px', borderRadius: 8, marginBottom: 4,
                                        border: isSelected ? `1px solid ${b.color}88` : '1px solid rgba(255,255,255,0.05)',
                                        background: isSelected ? `${b.color}15` : 'rgba(255,255,255,0.02)',
                                        cursor: 'pointer', transition: 'all 0.15s',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: b.color }} />
                                            <span style={{ fontSize: 11, fontWeight: 700, color: isSelected ? '#f1f5f9' : '#94a3b8' }}>
                                                {b.name}
                                            </span>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); deleteBoundary(b.id); }}
                                            style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 2 }}>
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, display: 'flex', gap: 8 }}>
                                        <span>{b.area.toFixed(1)} m </span>
                                        <span> </span>
                                        <span style={{ color: '#22c55e' }}>{bPanels.length} panels</span>
                                    </div>
                                    {isSelected && (
                                        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                                            <button onClick={(e) => { e.stopPropagation(); autoFillPanels(b.id); }}
                                                style={{
                                                    flex: 1, padding: '5px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                                                    border: `1px solid ${primaryColor}55`, background: `${primaryColor}18`,
                                                    color: primaryColor, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                                }}>
                                                <Zap size={11} /> Auto-Fill
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); clearPanels(b.id); }}
                                                style={{
                                                    flex: 1, padding: '5px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                                                    border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)',
                                                    color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                                }}>
                                                <Trash2 size={11} /> Clear
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/*    Exclusion Zones                                                   */}
            <SectionHeader title="Exclusion Zones" icon={Ban}
                open={openSections.exclusions} onToggle={() => toggle('exclusions')}
                count={exclusionZones.length} />
            {openSections.exclusions && (
                <div style={{ padding: '6px 10px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 10, color: '#64748b' }}>
                            {showExclusions ? <Eye size={11} /> : <EyeOff size={11} />}
                        </span>
                        <button onClick={toggleShowExclusions}
                            style={{
                                background: 'none', border: 'none', fontSize: 10,
                                color: showExclusions ? '#94a3b8' : '#475569', cursor: 'pointer',
                            }}>
                            {showExclusions ? 'Hide' : 'Show'} zones
                        </button>
                    </div>

                    {exclusionZones.length === 0 ? (
                        <div style={{
                            padding: '10px', borderRadius: 6,
                            background: 'rgba(239,68,68,0.05)', border: '1px dashed rgba(239,68,68,0.15)',
                            textAlign: 'center', color: '#475569', fontSize: 10,
                        }}>
                            No exclusion zones yet
                        </div>
                    ) : (
                        exclusionZones.map(ez => {
                            const isSelected = selectedExclusionId === ez.id;
                            return (
                                <div key={ez.id} style={{
                                    padding: '6px 8px', borderRadius: 6, marginBottom: 3,
                                    border: isSelected ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.04)',
                                    background: isSelected ? 'rgba(239,68,68,0.08)' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                }}>
                                    <div>
                                        <div style={{ fontSize: 10, fontWeight: 600, color: '#f87171' }}>{ez.label}</div>
                                        <div style={{ fontSize: 9, color: '#64748b' }}>{ez.area.toFixed(1)} m    {ez.type}</div>
                                    </div>
                                    <button onClick={() => deleteExclusionZone(ez.id)}
                                        style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 2 }}>
                                        <Trash2 size={11} />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/*    Bottom Reset                                                      */}
            <div style={{ marginTop: 'auto', padding: '10px 10px' }}>
                <button onClick={reset} style={{
                    width: '100%', padding: '7px 10px', borderRadius: 6,
                    border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)',
                    color: '#ef4444', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                    <RotateCcw size={12} /> Reset All
                </button>
            </div>
        </div>
    );
};

export default SurveyLeftSidebar;

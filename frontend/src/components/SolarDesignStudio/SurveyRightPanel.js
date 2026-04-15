// SurveyRightPanel.js   Properties panel: Panel config, Analysis, Sun simulation
import React, { useState, useEffect, useRef } from 'react';
import { useSolarSurveyStore, calculateSunPosition } from './useSolarSurveyStore';
import {
    Sun, Zap, TrendingUp, Leaf, BarChart3, Settings2, ChevronDown, ChevronRight,
    Thermometer, Clock
} from 'lucide-react';

//    Sub-components                                                             
const SectionTitle = ({ icon: Icon, title, open, onToggle, badge }) => (
    <button onClick={onToggle} style={{
        display: 'flex', alignItems: 'center', gap: 6, width: '100%',
        padding: '10px 14px', background: 'none', border: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        color: '#e2e8f0', fontSize: 11, fontWeight: 700, cursor: 'pointer',
        textAlign: 'left',
    }}>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {Icon && <Icon size={13} style={{ color: '#94a3b8' }} />}
        <span style={{ flex: 1 }}>{title}</span>
        {badge && (
            <span style={{
                fontSize: 9, padding: '1px 6px', borderRadius: 4,
                background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontWeight: 700,
            }}>{badge}</span>
        )}
    </button>
);

const Slider = ({ label, value, min, max, step, onChange, unit, color }) => (
    <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: '#64748b' }}>{label}</span>
            <span style={{ fontSize: 10, color: color || '#e2e8f0', fontWeight: 700, fontFamily: 'monospace' }}>
                {typeof value === 'number' ? value.toFixed(step < 1 ? (step < 0.1 ? 2 : 1) : 0) : value}{unit || ''}
            </span>
        </div>
        <input
            type="range" min={min} max={max} step={step} value={value}
            onChange={e => onChange(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: color || 'var(--primary, #3b82f6)', cursor: 'pointer', height: 4 }}
        />
    </div>
);

const StatCard = ({ icon: Icon, label, value, unit, color, small }) => (
    <div style={{
        padding: small ? '6px 8px' : '8px 10px',
        borderRadius: 8,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', gap: 8,
    }}>
        {Icon && (
            <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: `${color}15`, border: `1px solid ${color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <Icon size={13} color={color} />
            </div>
        )}
        <div>
            <div style={{ fontSize: 9, color: '#64748b', lineHeight: 1.2 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: color || '#f1f5f9', fontFamily: 'monospace' }}>
                {value} <span style={{ fontSize: 9, fontWeight: 500, color: '#64748b' }}>{unit}</span>
            </div>
        </div>
    </div>
);

const MetaRow = ({ label, value, color }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
        <span style={{ fontSize: 10, color: '#64748b' }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: color || '#e2e8f0', fontFamily: 'monospace' }}>{value}</span>
    </div>
);

//    Sun Position Display                                                       
const SunDial = ({ hour, dayOfYear, latitude }) => {
    const sunPos = calculateSunPosition(hour, dayOfYear, latitude);
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        const cx = w / 2, cy = h / 2, r = Math.min(cx, cy) - 8;

        ctx.clearRect(0, 0, w, h);

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // Direction markers
        ctx.fillStyle = '#475569';
        ctx.font = '8px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('N', cx, cy - r + 10);
        ctx.fillText('S', cx, cy + r - 4);
        ctx.fillText('E', cx + r - 8, cy + 3);
        ctx.fillText('W', cx - r + 8, cy + 3);

        // Sun position
        if (sunPos.altitude > 0) {
            const normalizedR = r * (1 - sunPos.altitude / 90);
            const azRad = (sunPos.azimuth - 90) * Math.PI / 180;
            const sx = cx + normalizedR * Math.cos(azRad);
            const sy = cy + normalizedR * Math.sin(azRad);

            // Sun glow
            const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 12);
            grad.addColorStop(0, 'rgba(251,191,36,0.6)');
            grad.addColorStop(1, 'rgba(251,191,36,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(sx, sy, 12, 0, Math.PI * 2);
            ctx.fill();

            // Sun dot
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(sx, sy, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }, [hour, dayOfYear, latitude, sunPos]);

    return (
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <canvas ref={canvasRef} width={100} height={100} style={{ borderRadius: '50%' }} />
            <div style={{ fontSize: 9, color: '#64748b', marginTop: 4 }}>
                Alt: {sunPos.altitude.toFixed(1)}    Az: {sunPos.azimuth.toFixed(1)} 
            </div>
        </div>
    );
};

//                                                                               
// MAIN RIGHT PANEL
//                                                                               
const SurveyRightPanel = () => {
    const {
        analysis, panelConfig, updatePanelConfig,
        sunSimulation, updateSunSimulation, toggleSunSimulation,
        boundaries, selectedBoundaryId, updateBoundary,
        autoFillPanels, clearPanels, runShadowAnalysis,
        panels,
    } = useSolarSurveyStore();

    const [sections, setSections] = useState({
        analysis: true,
        panelConfig: true,
        sunSim: false,
        selectedArea: true,
    });

    const toggle = (key) => setSections(s => ({ ...s, [key]: !s[key] }));
    const selectedBoundary = boundaries.find(b => b.id === selectedBoundaryId);
    const selectedPanels = panels.filter(p => p.boundaryId === selectedBoundaryId);

    // Auto-run shadow analysis when sun sim changes
    const sunAnimRef = useRef(null);
    useEffect(() => {
        if (sunSimulation.animate) {
            sunAnimRef.current = setInterval(() => {
                const cur = useSolarSurveyStore.getState().sunSimulation.hour;
                const next = cur + 0.1 * useSolarSurveyStore.getState().sunSimulation.speed;
                if (next > 20) {
                    updateSunSimulation({ hour: 5, animate: false });
                } else {
                    updateSunSimulation({ hour: next });
                }
            }, 100);
        }
        return () => { if (sunAnimRef.current) clearInterval(sunAnimRef.current); };
    }, [sunSimulation.animate, updateSunSimulation]);

    return (
        <div style={{
            width: 300,
            background: 'rgba(2,6,23,0.98)',
            borderLeft: '1px solid rgba(255,255,255,0.07)',
            overflowY: 'auto', overflowX: 'hidden',
            display: 'flex', flexDirection: 'column',
            fontSize: 12, color: '#e2e8f0', zIndex: 20,
        }}>

            {/*     SOLAR ANALYSIS                                                    */}
            <SectionTitle icon={BarChart3} title="Solar Analysis" open={sections.analysis}
                onToggle={() => toggle('analysis')} badge={`${analysis.totalPanels} panels`} />
            {sections.analysis && (
                <div style={{ padding: '10px 14px' }}>
                    {/* Top stats grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                        <StatCard icon={Zap} label="DC Capacity" value={analysis.totalCapacityKW} unit="kWp" color="#f59e0b" />
                        <StatCard icon={TrendingUp} label="Annual Gen." value={(analysis.estimatedAnnualKWh / 1000).toFixed(1)} unit="MWh" color="#22c55e" />
                        <StatCard icon={Sun} label="Total Panels" value={analysis.totalPanels} unit="" color="#3b82f6" />
                        <StatCard icon={Leaf} label="CO  Offset" value={analysis.co2Offset} unit="t/yr" color="#10b981" />
                    </div>

                    {/* Detail rows */}
                    <div style={{
                        padding: '8px 10px', borderRadius: 6,
                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                    }}>
                        <MetaRow label="Total Area" value={`${analysis.totalArea} m `} />
                        <MetaRow label="Usable Area" value={`${analysis.usableArea} m `} color="#22c55e" />
                        <MetaRow label="Exclusion Area" value={`${analysis.exclusionArea} m `} color="#ef4444" />
                        <MetaRow label="Coverage Ratio" value={`${analysis.coverageRatio}%`} color="#f59e0b" />
                        <MetaRow label="Shaded Panels" value={`${analysis.shadedPanels}`} color={analysis.shadedPanels > 0 ? '#f59e0b' : '#22c55e'} />
                        <MetaRow label="Avg Shade Factor" value={`${(analysis.avgShadeFactor * 100).toFixed(0)}%`} />
                        <MetaRow label="Performance Ratio" value={`${(analysis.performanceRatio * 100).toFixed(0)}%`} />
                    </div>

                    {/* Shadow analysis button */}
                    <button onClick={runShadowAnalysis} style={{
                        width: '100%', padding: '8px 12px', borderRadius: 6, marginTop: 8,
                        border: '1px solid rgba(245,158,11,0.4)',
                        background: 'rgba(245,158,11,0.1)', color: '#f59e0b',
                        fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                        <Sun size={13} /> Run Shadow Analysis
                    </button>
                </div>
            )}

            {/*     SELECTED AREA                                                     */}
            {selectedBoundary && (
                <>
                    <SectionTitle icon={Settings2} title={selectedBoundary.name}
                        open={sections.selectedArea} onToggle={() => toggle('selectedArea')}
                        badge={`${selectedPanels.length} panels`} />
                    {sections.selectedArea && (
                        <div style={{ padding: '10px 14px' }}>
                            <div style={{
                                padding: '8px 10px', borderRadius: 6, marginBottom: 10,
                                background: `${selectedBoundary.color}10`,
                                border: `1px solid ${selectedBoundary.color}30`,
                            }}>
                                <MetaRow label="Area" value={`${selectedBoundary.area.toFixed(1)} m `} color={selectedBoundary.color} />
                                <MetaRow label="Panels" value={selectedPanels.length} color="#22c55e" />
                                <MetaRow label="Capacity" value={`${((selectedPanels.length * panelConfig.power) / 1000).toFixed(2)} kWp`} color="#f59e0b" />
                            </div>

                            <Slider label="Building Height" value={selectedBoundary.height || 3}
                                min={1} max={30} step={0.5} unit="m"
                                onChange={v => updateBoundary(selectedBoundaryId, { height: v })} />

                            {/* Area name edit */}
                            <div style={{ marginBottom: 10 }}>
                                <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 4 }}>Area Name</label>
                                <input
                                    value={selectedBoundary.name}
                                    onChange={e => updateBoundary(selectedBoundaryId, { name: e.target.value })}
                                    style={{
                                        width: '100%', padding: '5px 8px', borderRadius: 4,
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', fontSize: 11,
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => autoFillPanels(selectedBoundaryId)} style={{
                                    flex: 1, padding: '7px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                                    border: '1px solid var(--primary, #3b82f6)44',
                                    background: 'var(--primary, #3b82f6)18', color: 'var(--primary, #3b82f6)',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                }}>
                                    <Zap size={12} /> Auto-Fill Panels
                                </button>
                                <button onClick={() => clearPanels(selectedBoundaryId)} style={{
                                    flex: 1, padding: '7px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                                    border: '1px solid rgba(239,68,68,0.3)',
                                    background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                                    cursor: 'pointer',
                                }}>
                                    Clear
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/*     PANEL CONFIGURATION                                               */}
            <SectionTitle icon={Settings2} title="Panel Configuration"
                open={sections.panelConfig} onToggle={() => toggle('panelConfig')} />
            {sections.panelConfig && (
                <div style={{ padding: '10px 14px' }}>
                    {/* Orientation toggle */}
                    <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                        {['landscape', 'portrait'].map(o => (
                            <button key={o} onClick={() => updatePanelConfig({ orientation: o })}
                                style={{
                                    flex: 1, padding: '6px 10px', borderRadius: 6,
                                    border: panelConfig.orientation === o
                                        ? '1px solid var(--primary, #3b82f6)' : '1px solid rgba(255,255,255,0.08)',
                                    background: panelConfig.orientation === o
                                        ? 'var(--primary, #3b82f6)22' : 'rgba(255,255,255,0.03)',
                                    color: panelConfig.orientation === o ? 'var(--primary, #3b82f6)' : '#64748b',
                                    fontSize: 10, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                                }}>
                                {o === 'landscape' ? ' ' : ' '} {o}
                            </button>
                        ))}
                    </div>

                    <Slider label="Panel Width" value={panelConfig.width}
                        min={0.5} max={3} step={0.05} unit="m"
                        onChange={v => updatePanelConfig({ width: v })} />
                    <Slider label="Panel Height" value={panelConfig.height}
                        min={0.3} max={2} step={0.05} unit="m"
                        onChange={v => updatePanelConfig({ height: v })} />
                    <Slider label="Power Rating" value={panelConfig.power}
                        min={100} max={800} step={5} unit="W"
                        onChange={v => updatePanelConfig({ power: v })} color="#f59e0b" />
                    <Slider label="Panel Tilt" value={panelConfig.tilt}
                        min={0} max={45} step={1} unit=" "
                        onChange={v => updatePanelConfig({ tilt: v })} />
                    <Slider label="Azimuth" value={panelConfig.azimuth}
                        min={0} max={360} step={5} unit=" "
                        onChange={v => updatePanelConfig({ azimuth: v })} />
                    <Slider label="Spacing" value={panelConfig.spacing}
                        min={0} max={1} step={0.01} unit="m"
                        onChange={v => updatePanelConfig({ spacing: v })} />
                    <Slider label="Row Spacing" value={panelConfig.rowSpacing}
                        min={0.5} max={5} step={0.1} unit="m"
                        onChange={v => updatePanelConfig({ rowSpacing: v })} />
                    <Slider label="Edge Setback" value={panelConfig.setback}
                        min={0} max={3} step={0.1} unit="m"
                        onChange={v => updatePanelConfig({ setback: v })} />
                </div>
            )}

            {/*     SUN SIMULATION                                                    */}
            <SectionTitle icon={Sun} title="Sun Simulation"
                open={sections.sunSim} onToggle={() => toggle('sunSim')}
                badge={sunSimulation.enabled ? 'ON' : 'OFF'} />
            {sections.sunSim && (
                <div style={{ padding: '10px 14px' }}>
                    {/* Toggle */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginBottom: 12,
                    }}>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>Enable Simulation</span>
                        <div
                            onClick={toggleSunSimulation}
                            style={{
                                width: 36, height: 20, borderRadius: 10,
                                background: sunSimulation.enabled ? 'var(--primary, #3b82f6)' : 'rgba(255,255,255,0.1)',
                                position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                                border: '1px solid rgba(255,255,255,0.1)',
                            }}
                        >
                            <div style={{
                                position: 'absolute', top: 2,
                                left: sunSimulation.enabled ? 17 : 2,
                                width: 14, height: 14, borderRadius: '50%',
                                background: '#fff', transition: 'left 0.2s',
                            }} />
                        </div>
                    </div>

                    {sunSimulation.enabled && (
                        <>
                            <SunDial
                                hour={sunSimulation.hour}
                                dayOfYear={sunSimulation.dayOfYear}
                                latitude={sunSimulation.latitude}
                            />

                            <Slider label="Hour" value={sunSimulation.hour}
                                min={5} max={20} step={0.25} unit="h" color="#fbbf24"
                                onChange={v => updateSunSimulation({ hour: v })} />
                            <Slider label="Day of Year" value={sunSimulation.dayOfYear}
                                min={1} max={365} step={1} color="#fbbf24"
                                onChange={v => updateSunSimulation({ dayOfYear: v })} />
                            <Slider label="Latitude" value={sunSimulation.latitude}
                                min={-60} max={60} step={0.1} unit=" "
                                onChange={v => updateSunSimulation({ latitude: v })} />

                            {/* Animate button */}
                            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                <button onClick={() => updateSunSimulation({ animate: !sunSimulation.animate })}
                                    style={{
                                        flex: 1, padding: '7px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                                        border: sunSimulation.animate
                                            ? '1px solid rgba(251,191,36,0.5)' : '1px solid rgba(255,255,255,0.1)',
                                        background: sunSimulation.animate
                                            ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
                                        color: sunSimulation.animate ? '#fbbf24' : '#94a3b8',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                    }}>
                                    <Clock size={11} />
                                    {sunSimulation.animate ? '  Pause' : '  Animate Day'}
                                </button>
                                <button onClick={runShadowAnalysis}
                                    style={{
                                        padding: '7px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.04)', color: '#94a3b8',
                                        cursor: 'pointer',
                                    }}>
                                    <Thermometer size={11} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/*     QUICK TIPS                                                        */}
            <div style={{
                margin: '10px 14px', padding: '10px 12px', borderRadius: 8,
                background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)',
            }}>
                <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.6 }}>
                       <strong style={{ color: '#e2e8f0' }}>Quick Start:</strong><br />
                    1. Use <strong>Draw Area</strong> to outline a roof<br />
                    2. Click <strong>Auto-Fill Panels</strong> to populate<br />
                    3. Draw <strong>Exclusion Zones</strong> for obstacles<br />
                    4. Enable <strong>Sun Simulation</strong> for shadow analysis
                </div>
            </div>
        </div>
    );
};

export default SurveyRightPanel;

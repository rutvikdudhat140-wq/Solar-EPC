// RightPanel.js   Properties panel matching Arka360 right sidebar
import React from 'react';
import { useSolarStore } from './useSolarStore';

const Slider = ({ label, value, min, max, step, onChange, unit }) => (
    <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: '#64748b' }}>{label}</span>
            <span style={{ fontSize: 11, color: '#f1f5f9', fontWeight: 700 }}>
                {typeof value === 'number' ? value.toFixed(step < 1 ? 2 : 1) : value}{unit || ''}
            </span>
        </div>
        <input
            type="range"
            min={min} max={max} step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }}
        />
    </div>
);

const SectionTitle = ({ children }) => (
    <p style={{
        fontSize: 10, fontWeight: 700, color: '#475569',
        textTransform: 'uppercase', letterSpacing: '0.1em',
        marginBottom: 12, marginTop: 4,
    }}>
        {children}
    </p>
);

const MetaRow = ({ label, value, valueColor }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: '#64748b' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: valueColor || '#f1f5f9' }}>{value}</span>
    </div>
);

const ActionBtn = ({ children, onClick, variant = 'secondary' }) => (
    <button
        onClick={onClick}
        style={{
            width: '100%',
            padding: '7px 12px',
            borderRadius: 8,
            border: variant === 'primary'
                ? '1px solid rgba(37,99,235,0.5)'
                : '1px solid rgba(255,255,255,0.08)',
            background: variant === 'primary'
                ? 'rgba(37,99,235,0.2)'
                : 'rgba(255,255,255,0.04)',
            color: variant === 'primary' ? '#3b82f6' : '#94a3b8',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: 6,
            textAlign: 'center',
            transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.background = variant === 'primary'
                ? 'rgba(37,99,235,0.35)' : 'rgba(255,255,255,0.08)';
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.background = variant === 'primary'
                ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.04)';
        }}
    >
        {children}
    </button>
);

const Toggle = ({ label, checked, onChange }) => {
    // Get primary color from CSS variable
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#2563eb';

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: '#64748b' }}>{label}</span>
            <div
                onClick={() => onChange(!checked)}
                style={{
                    width: 36, height: 20, borderRadius: 10,
                    background: checked ? primaryColor : 'rgba(255,255,255,0.1)',
                    position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                    border: '1px solid rgba(255,255,255,0.1)',
                }}
            >
                <div style={{
                    position: 'absolute', top: 2,
                    left: checked ? 17 : 2,
                    width: 14, height: 14, borderRadius: '50%',
                    background: '#fff', transition: 'left 0.2s',
                }} />
            </div>
        </div>
    );
};

const RightPanel = ({ projectName, designName }) => {
    const {
        selectedRoofId, roofs, panels,
        panelSettings, roofSettings, solarAnalysis, sunSimulation,
        addRoof, updateRoof, deleteRoof, autoFillPanels, clearPanelsOnRoof,
        addObstacle, recalculate, setSelectedRoof,
        updatePanelSettings, updateSunSimulation,
    } = useSolarStore();

    const selectedRoof = roofs.find((r) => r.id === selectedRoofId);
    const roofPanels = selectedRoof ? panels.filter((p) => p.roofId === selectedRoofId) : [];
    const [ignored, setIgnored] = React.useState(false);
    const [sunPath, setSunPath] = React.useState(false);

    const handleAddDefaultRoof = () => {
        addRoof({
            label: `Roof ${roofs.length + 1}`,
            x: (roofs.length % 3) * 25 - 25,
            z: Math.floor(roofs.length / 3) * 16,
            width: 20, depth: 12, rotation: 0,
        });
    };

    const panelStyle = {
        width: 280,
        background: 'rgba(2,6,23,0.97)',
        borderLeft: '1px solid rgba(255,255,255,0.07)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        fontSize: 12,
        color: '#f1f5f9',
    };

    const sectionStyle = {
        padding: '14px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
    };

    return (
        <div style={panelStyle}>

            {/*    Home Summary                                                     */}
            <div style={{ ...sectionStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>Home Summary</span>
                <span style={{ fontSize: 16, color: '#64748b', cursor: 'pointer' }}> </span>
            </div>

            <div style={sectionStyle}>
                <MetaRow label="Project Name" value={projectName || 'Mr. Demo 2'} />
                <MetaRow label="Design Name" value={designName || 'Design 1'} />
                <MetaRow label="Latitude" value="28.543170" />
                <MetaRow label="Longitude" value="77.335763" />
                <div style={{ height: 8 }} />
                <MetaRow label="DC Size" value={`${(solarAnalysis?.totalDCCapacity || 0).toFixed(2)} kW`} valueColor="#f59e0b" />
                <MetaRow label="Stringed DC Size" value="0.00 kW" />
                <MetaRow label="AC Size" value="0.00 kW" />
                <MetaRow label="DC-AC Ratio" value="TBD" />
                <MetaRow label="Module Quantity" value={solarAnalysis?.totalPanels || 0} valueColor="#3b82f6" />
                <MetaRow label="Inverter Quantity" value="0" />
                <MetaRow label="Optimizer Quantity" value="0" />
            </div>

            {/*    Add Roof Button                                                   */}
            <div style={sectionStyle}>
                <ActionBtn variant="primary" onClick={handleAddDefaultRoof}>
                    + Add New Roof Model
                </ActionBtn>
            </div>

            {/*    Roof List                                                        */}
            {roofs.length > 0 && (
                <div style={sectionStyle}>
                    <SectionTitle>Roof Models ({roofs.length})</SectionTitle>
                    {roofs.map((roof) => {
                        const rPanels = panels.filter((p) => p.roofId === roof.id);
                        const isSelected = selectedRoofId === roof.id;
                        return (
                            <div
                                key={roof.id}
                                onClick={() => setSelectedRoof(roof.id)}
                                style={{
                                    padding: '8px 10px',
                                    borderRadius: 8,
                                    marginBottom: 4,
                                    border: isSelected
                                        ? '1px solid rgba(59,130,246,0.5)'
                                        : '1px solid rgba(255,255,255,0.06)',
                                    background: isSelected
                                        ? 'rgba(37,99,235,0.12)'
                                        : 'rgba(255,255,255,0.03)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: isSelected ? '#3b82f6' : '#94a3b8' }}>
                                        {roof.label || roof.id}
                                    </span>
                                    <span style={{ fontSize: 10, color: '#f59e0b' }}>{rPanels.length} panels</span>
                                </div>
                                <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>
                                    Area: {(roof.area || 0).toFixed(1)} m 
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/*    Selected Roof   Summary                                           */}
            {selectedRoof && (
                <>
                    <div style={sectionStyle}>
                        <SectionTitle>Summary</SectionTitle>
                        <MetaRow label="Model Number" value={selectedRoof.id} />
                        <MetaRow label="Model Area" value={`${(selectedRoof.area || 0).toFixed(3)} m `} />
                        <MetaRow
                            label="Panel Count"
                            value={`${roofPanels.length} panels`}
                            valueColor={roofPanels.length > 0 ? '#22c55e' : '#f59e0b'}
                        />
                    </div>

                    {/*    Dormer Buttons                                               */}
                    <div style={sectionStyle}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
                            <ActionBtn onClick={() => deleteRoof(selectedRoofId)}>Delete</ActionBtn>
                            <ActionBtn onClick={() => addObstacle({ type: 'vent', roofId: selectedRoofId })}>Add Vent</ActionBtn>
                            <ActionBtn onClick={() => addObstacle({ type: 'chimney', roofId: selectedRoofId })}>Add Chimney</ActionBtn>
                            <ActionBtn onClick={() => addObstacle({ type: 'skylight', roofId: selectedRoofId })}>Add Skylight</ActionBtn>
                        </div>
                    </div>

                    {/*    Panel Buttons                                                */}
                    <div style={sectionStyle}>
                        <SectionTitle>Panel Layout</SectionTitle>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                            <ActionBtn variant="primary" onClick={() => autoFillPanels(selectedRoofId)}>
                                  Auto-Fill Panels
                            </ActionBtn>
                            <ActionBtn onClick={() => clearPanelsOnRoof(selectedRoofId)}>
                                   Clear Panels
                            </ActionBtn>
                        </div>
                        {roofPanels.length > 0 && (
                            <div style={{ marginTop: 8, fontSize: 11, color: '#64748b' }}>
                                {roofPanels.length} panels   {((roofPanels.length * (panelSettings?.power || 400)) / 1000).toFixed(2)} kWp
                            </div>
                        )}
                    </div>

                    {/*    Roof Model Properties                                        */}
                    <div style={sectionStyle}>
                        <SectionTitle>Roof Model Properties</SectionTitle>

                        <Slider
                            label="Roof Height"
                            value={selectedRoof.height || roofSettings?.height || 3}
                            min={1} max={20} step={0.1}
                            unit=" m"
                            onChange={(v) => updateRoof(selectedRoofId, { height: v })}
                        />
                        <Slider
                            label="Panel Tilt"
                            value={panelSettings?.tilt || 20}
                            min={0} max={45} step={0.5}
                            unit=" "
                            onChange={(v) => updatePanelSettings({ tilt: v })}
                        />
                        <Slider
                            label="Panel Azimuth"
                            value={panelSettings?.azimuth || 180}
                            min={0} max={360} step={5}
                            unit=" "
                            onChange={(v) => updatePanelSettings({ azimuth: v })}
                        />

                        <Toggle label="Ignored" checked={ignored} onChange={setIgnored} />
                    </div>

                    {/*    Obstacles                                                    */}
                    <div style={sectionStyle}>
                        <SectionTitle>Obstacles</SectionTitle>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                            <ActionBtn onClick={() => addObstacle({ type: 'tree', roofId: selectedRoofId })}>
                                   Add Tree
                            </ActionBtn>
                            <ActionBtn onClick={() => addObstacle({ type: 'tank', roofId: selectedRoofId })}>
                                   Water Tank
                            </ActionBtn>
                        </div>
                    </div>

                    {/*    Update / Cancel                                               */}
                    <div style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
                        <ActionBtn>Cancel</ActionBtn>
                        <ActionBtn variant="primary" onClick={() => recalculate()}>
                            Update
                        </ActionBtn>
                    </div>
                </>
            )}

            {/*    Sun Path Simulation                                              */}
            <div style={sectionStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: sunPath ? 12 : 0 }}>
                    <div>
                        <span style={{ fontSize: 11, fontWeight: 700 }}>Sun Path Simulation</span>
                        <span style={{
                            marginLeft: 6, fontSize: 9, padding: '1px 5px', borderRadius: 4,
                            background: 'rgba(59,130,246,0.15)', color: '#3b82f6', fontWeight: 700,
                        }}> </span>
                    </div>
                    <Toggle label="" checked={sunPath} onChange={setSunPath} />
                </div>
                {sunPath && (
                    <>
                        <Slider
                            label="Hour"
                            value={sunSimulation?.hour || 12}
                            min={5} max={20} step={0.5}
                            unit="h"
                            onChange={(v) => updateSunSimulation({ hour: v })}
                        />
                        <Slider
                            label="Day of Year"
                            value={sunSimulation?.day || 172}
                            min={1} max={365} step={1}
                            onChange={(v) => updateSunSimulation({ day: v })}
                        />
                    </>
                )}
            </div>

        </div>
    );
};

export default RightPanel;

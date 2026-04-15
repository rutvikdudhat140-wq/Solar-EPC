// BottomBar.js   Map/view toggle bottom controls
import React from 'react';

const BtnGroup = ({ children }) => (
    <div style={{ display: 'flex', gap: 8 }}>
        {children}
    </div>
);

const CtrlBtn = ({ icon, label, active, onClick, hasArrow }) => (
    <button
        onClick={onClick}
        style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 24,
            border: '1px solid rgba(255,255,255,0.18)',
            background: active ? 'rgba(37,99,235,0.3)' : 'rgba(15,24,41,0.92)',
            color: active ? '#93c5fd' : '#e2e8f0',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            transition: 'all 0.15s',
            backdropFilter: 'blur(8px)',
        }}
    >
        <span>{icon}</span>
        <span>{label}</span>
        {hasArrow && <span style={{ fontSize: 10, marginLeft: 2 }}> </span>}
    </button>
);

const BottomBar = ({ mapType, setMapType, solar3D, setSolar3D }) => (
    <div style={{
        position: 'absolute', bottom: 20, left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', gap: 8, zIndex: 10,
        pointerEvents: 'auto',
    }}>
        <BtnGroup>
            <CtrlBtn icon="  " label="Dual Map" />
            <CtrlBtn icon="  " label="Resize" />
        </BtnGroup>
        <BtnGroup>
            <CtrlBtn
                icon="  "
                label="Google"
                hasArrow
                active={mapType === 'google'}
                onClick={() => setMapType('google')}
            />
            <CtrlBtn
                icon="  "
                label="Google Solar 3D"
                hasArrow
                active={solar3D}
                onClick={() => setSolar3D(!solar3D)}
            />
        </BtnGroup>
    </div>
);

export default BottomBar;

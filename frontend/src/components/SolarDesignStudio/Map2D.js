// Map2D.js   Google Maps satellite view with polygon drawing
import React, { useEffect, useRef, useCallback } from 'react';
import { useSolarStore } from './useSolarStore';

/* Converts a google.maps LatLng path   local X/Z meters (relative to centroid) */
function pathToLocalXZ(path) {
    const points = [];
    for (let i = 0; i < path.getLength(); i++) {
        points.push({ lat: path.getAt(i).lat(), lng: path.getAt(i).lng() });
    }
    const cLat = points.reduce((a, p) => a + p.lat, 0) / points.length;
    const cLng = points.reduce((a, p) => a + p.lng, 0) / points.length;
    return points.map((p) => ({
        x: (p.lng - cLng) * 111320 * Math.cos((cLat * Math.PI) / 180),
        z: (p.lat - cLat) * 110540,
    }));
}

const GMAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';

const Map2D = ({ lat = 28.54317, lng = 77.335763 }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const drawingMgrRef = useRef(null);
    const { addRoof, activeTool, setActiveTool } = useSolarStore();

    const initMap = useCallback(() => {
        if (!window.google || !mapRef.current || mapInstanceRef.current) return;

        const map = new window.google.maps.Map(mapRef.current, {
            center: { lat, lng },
            zoom: 20,
            mapTypeId: 'satellite',
            tilt: 0,
            mapTypeControl: false,
            zoomControl: true,
            zoomControlOptions: { position: window.google.maps.ControlPosition.RIGHT_CENTER },
            streetViewControl: false,
            fullscreenControl: false,
        });
        mapInstanceRef.current = map;

        const dm = new window.google.maps.drawing.DrawingManager({
            drawingMode: null,
            drawingControl: false,
            polygonOptions: {
                fillColor: '#2563eb',
                fillOpacity: 0.35,
                strokeWeight: 2,
                strokeColor: '#93c5fd',
                clickable: true,
                editable: true,
                zIndex: 1,
            },
        });
        dm.setMap(map);
        drawingMgrRef.current = dm;

        window.google.maps.event.addListener(dm, 'polygoncomplete', (polygon) => {
            const path = polygon.getPath();
            const area = window.google.maps.geometry.spherical
                ? window.google.maps.geometry.spherical.computeArea(path)
                : 0;

            const local = pathToLocalXZ(path);
            const xs = local.map((p) => p.x);
            const zs = local.map((p) => p.z);
            const w = Math.max(...xs) - Math.min(...xs);
            const d = Math.max(...zs) - Math.min(...zs);

            const { roofs } = useSolarStore.getState();
            addRoof({
                label: `Roof ${roofs.length + 1}`,
                x: 0, z: 0,
                width: Math.max(5, Math.round(w)),
                depth: Math.max(5, Math.round(d)),
                area: area.toFixed(1),
                coordinates: Array.from({ length: path.getLength() }, (_, i) => ({
                    lat: path.getAt(i).lat(), lng: path.getAt(i).lng(),
                })),
            });
            dm.setDrawingMode(null);
            setActiveTool('select');
        });
    }, [lat, lng, addRoof, setActiveTool]);

    // Load Google Maps script
    useEffect(() => {
        if (window.google) { initMap(); return; }
        if (!GMAPS_KEY) return; // No key   show placeholder

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=drawing,geometry,places`;
        script.async = true;
        script.onload = initMap;
        document.head.appendChild(script);
        return () => { /* cleanup if needed */ };
    }, [initMap]);

    // Sync drawing tool from store
    useEffect(() => {
        const dm = drawingMgrRef.current;
        if (!dm || !window.google) return;
        if (activeTool === 'drawRoof') {
            dm.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
        } else {
            dm.setDrawingMode(null);
        }
    }, [activeTool]);

    // If no API key, show a nice placeholder
    if (!GMAPS_KEY) {
        return (
            <div style={{
                width: '100%', height: '100%',
                background: 'linear-gradient(135deg, #0a1520 0%, #0f2340 50%, #0a1520 100%)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 16,
            }}>
                {/* Satellite-like grid overlay */}
                <div style={{
                    position: 'absolute', inset: 0, opacity: 0.08,
                    backgroundImage: 'linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                }} />

                {/* Building silhouettes */}
                <div style={{ position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4, opacity: 0.15 }}>
                    {[120, 80, 150, 60, 100, 90, 140].map((h, i) => (
                        <div key={i} style={{
                            width: 40 + i * 5, height: h,
                            background: '#1e3a5f', border: '1px solid #2563eb',
                            borderRadius: '2px 2px 0 0',
                        }} />
                    ))}
                </div>

                <div style={{
                    textAlign: 'center', zIndex: 1, padding: 32,
                    background: 'rgba(2,6,23,0.85)', borderRadius: 16,
                    border: '1px solid rgba(59,130,246,0.2)',
                    backdropFilter: 'blur(12px)', maxWidth: 460,
                }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>   </div>
                    <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                        Satellite Map View
                    </p>
                    <p style={{ color: '#64748b', fontSize: 12, lineHeight: 1.6, marginBottom: 16 }}>
                        Add <code style={{ color: '#fbbf24', background: 'rgba(245,158,11,0.1)', padding: '1px 6px', borderRadius: 4 }}>REACT_APP_GOOGLE_MAPS_API_KEY</code> to your <code style={{ color: '#fbbf24' }}>.env</code> file to enable live satellite imagery.
                    </p>
                    <div style={{
                        padding: '10px 16px', borderRadius: 8,
                        background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.3)',
                        color: '#3b82f6', fontSize: 11, fontWeight: 600, marginBottom: 12,
                    }}>
                        Switch to 3D View to design with full Three.js engine  
                    </div>
                    <p style={{ color: '#475569', fontSize: 11 }}>
                        Latitude: {lat.toFixed(6)}   Longitude: {lng.toFixed(6)}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

            {/* Draw tool hint */}
            {activeTool === 'drawRoof' && (
                <div style={{
                    position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(37,99,235,0.9)', color: '#fff', fontSize: 12,
                    fontWeight: 600, padding: '6px 16px', borderRadius: 20,
                    pointerEvents: 'none', zIndex: 10,
                }}>
                    Click to draw roof polygon   double-click to finish
                </div>
            )}

            {/* Coords display */}
            <div style={{
                position: 'absolute', bottom: 4, right: 8,
                background: 'rgba(0,0,0,0.6)', color: '#94a3b8',
                fontSize: 10, padding: '2px 8px', borderRadius: 4,
                fontFamily: 'monospace', pointerEvents: 'none',
            }}>
                x:   y:   z:  
            </div>
        </div>
    );
};

export default Map2D;

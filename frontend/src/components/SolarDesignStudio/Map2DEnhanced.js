// Map2DEnhanced.js   LIVE Google Maps with real-time location, boundary selection, and manual panel placement
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSolarStore } from './useSolarStore';
import { MapPin, Target, Grid3x3, Plus, Trash2, Play, StopCircle } from 'lucide-react';

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

const Map2DEnhanced = ({ lat = 28.54317, lng = 77.335763 }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const drawingMgrRef = useRef(null);
    const watchIdRef = useRef(null);
    const userMarkerRef = useRef(null);
    const panelMarkersRef = useRef([]);
    const selectedPolygonRef = useRef(null);

    const [isTracking, setIsTracking] = useState(false);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [manualMode, setManualMode] = useState(false);
    const [gridMode, setGridMode] = useState({ enabled: false, rows: 3, cols: 5 });
    const [selectedArea, setSelectedArea] = useState(null);

    const {
        addRoof, addPanel, panels, selectedRoofId, roofs,
        activeTool, setActiveTool, panelSettings, updateViewSettings
    } = useSolarStore();

    // Initialize Google Maps
    const initMap = useCallback(() => {
        if (!window.google || !mapRef.current || mapInstanceRef.current) return;

        const map = new window.google.maps.Map(mapRef.current, {
            center: { lat, lng },
            zoom: 20,
            mapTypeId: 'satellite',
            tilt: 0,
            mapTypeControl: true,
            zoomControl: true,
            zoomControlOptions: { position: window.google.maps.ControlPosition.RIGHT_CENTER },
            streetViewControl: false,
            fullscreenControl: true,
        });
        mapInstanceRef.current = map;

        // Drawing Manager for boundary selection
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

        // Polygon complete event - Boundary Selected
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

            const coordinates = Array.from({ length: path.getLength() }, (_, i) => ({
                lat: path.getAt(i).lat(),
                lng: path.getAt(i).lng(),
            }));

            // Calculate center point
            const centerLat = coordinates.reduce((sum, p) => sum + p.lat, 0) / coordinates.length;
            const centerLng = coordinates.reduce((sum, p) => sum + p.lng, 0) / coordinates.length;

            const roofData = {
                label: `Roof ${roofs.length + 1}`,
                points: coordinates.map(c => [c.lng, c.lat]),
                bounds: {
                    minX: Math.min(...xs),
                    maxX: Math.max(...xs),
                    minY: Math.min(...zs),
                    maxY: Math.max(...zs),
                },
                width: Math.max(5, Math.round(w)),
                depth: Math.max(5, Math.round(d)),
                area: area.toFixed(1),
                coordinates,
                center: { lat: centerLat, lng: centerLng },
            };

            addRoof(roofData);
            setSelectedArea({ polygon, bounds: roofData.bounds, center: roofData.center });
            selectedPolygonRef.current = polygon;

            dm.setDrawingMode(null);
            setActiveTool('select');

            // Enable manual panel placement mode
            setManualMode(true);
        });

        // Click event for manual panel placement
        map.addListener('click', (event) => {
            if (manualMode && selectedArea) {
                const clickLat = event.latLng.lat();
                const clickLng = event.latLng.lng();

                // Check if click is inside selected area
                if (window.google.maps.geometry.poly.containsLocation(
                    event.latLng,
                    selectedPolygonRef.current
                )) {
                    placePanelAtLocation(clickLat, clickLng);
                }
            }
        });

    }, [lat, lng, addRoof, roofs, manualMode, selectedArea]);

    // Place panel at clicked location
    const placePanelAtLocation = useCallback((lat, lng) => {
        if (!selectedRoofId) return;

        const roof = roofs.find(r => r.id === selectedRoofId);
        if (!roof) return;

        // Convert lat/lng to local X/Z coordinates
        const centerLat = roof.center.lat;
        const centerLng = roof.center.lng;
        const x = (lng - centerLng) * 111320 * Math.cos((centerLat * Math.PI) / 180);
        const z = (lat - centerLat) * 110540;

        // Add panel to store
        addPanel({
            roofId: selectedRoofId,
            position: { x, y: roof.height || 3, z },
            coordinates: { lat, lng },
        });

        // Add marker to map
        if (mapInstanceRef.current && window.google) {
            const marker = new window.google.maps.Marker({
                position: { lat, lng },
                map: mapInstanceRef.current,
                icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    fillColor: '#3b82f6',
                    fillOpacity: 0.8,
                    strokeColor: '#fff',
                    strokeWeight: 2,
                    scale: 6,
                },
                draggable: true,
                title: 'Solar Panel',
            });

            panelMarkersRef.current.push(marker);

            // Drag event to update panel position
            marker.addListener('dragend', (e) => {
                const newLat = e.latLng.lat();
                const newLng = e.latLng.lng();
                // Update panel position in store
                const newX = (newLng - centerLng) * 111320 * Math.cos((centerLat * Math.PI) / 180);
                const newZ = (newLat - centerLat) * 110540;
                // Find and update the panel
                // This would require panel ID tracking
            });
        }

    }, [selectedRoofId, roofs, addPanel]);

    // Auto-place panels in grid
    const autoPlaceGrid = useCallback(() => {
        if (!selectedArea || !selectedRoofId) return;

        const roof = roofs.find(r => r.id === selectedRoofId);
        if (!roof) return;

        const { rows, cols } = gridMode;
        const { bounds, center } = selectedArea;

        // Calculate grid spacing
        const width = (bounds.maxX - bounds.minX) / cols;
        const height = (bounds.maxY - bounds.minY) / rows;

        // Place panels in grid
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = bounds.minX + (col + 0.5) * width;
                const z = bounds.minY + (row + 0.5) * height;

                // Convert to lat/lng
                const lat = center.lat + (z / 110540);
                const lng = center.lng + (x / (111320 * Math.cos((center.lat * Math.PI) / 180)));

                // Check if point is inside polygon
                const point = new window.google.maps.LatLng(lat, lng);
                if (window.google.maps.geometry.poly.containsLocation(
                    point,
                    selectedPolygonRef.current
                )) {
                    placePanelAtLocation(lat, lng);
                }
            }
        }
    }, [selectedArea, selectedRoofId, roofs, gridMode, placePanelAtLocation]);

    // Start live location tracking
    const startTracking = useCallback(() => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        setIsTracking(true);

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                setCurrentLocation({ lat: latitude, lng: longitude, accuracy });

                // Update map center
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.panTo({ lat: latitude, lng: longitude });
                }

                // Update or create user marker
                if (!userMarkerRef.current && window.google && mapInstanceRef.current) {
                    userMarkerRef.current = new window.google.maps.Marker({
                        position: { lat: latitude, lng: longitude },
                        map: mapInstanceRef.current,
                        icon: {
                            path: window.google.maps.SymbolPath.CIRCLE,
                            fillColor: '#22c55e',
                            fillOpacity: 1,
                            strokeColor: '#fff',
                            strokeWeight: 3,
                            scale: 8,
                        },
                        title: 'Your Location',
                    });

                    // Accuracy circle
                    new window.google.maps.Circle({
                        strokeColor: '#22c55e',
                        strokeOpacity: 0.4,
                        strokeWeight: 1,
                        fillColor: '#22c55e',
                        fillOpacity: 0.1,
                        map: mapInstanceRef.current,
                        center: { lat: latitude, lng: longitude },
                        radius: accuracy,
                    });
                } else if (userMarkerRef.current) {
                    userMarkerRef.current.setPosition({ lat: latitude, lng: longitude });
                }

                // Update store view settings
                updateViewSettings({
                    mapCenter: { lat: latitude, lng: longitude },
                });
            },
            (error) => {
                console.error('Error getting location:', error);
                setIsTracking(false);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 5000,
            }
        );
    }, [updateViewSettings]);

    // Stop tracking
    const stopTracking = useCallback(() => {
        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setIsTracking(false);
    }, []);

    // Clear all panel markers
    const clearPanelMarkers = useCallback(() => {
        panelMarkersRef.current.forEach(marker => marker.setMap(null));
        panelMarkersRef.current = [];
    }, []);

    // Load Google Maps script
    useEffect(() => {
        if (window.google) { initMap(); return; }
        if (!GMAPS_KEY) return;

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=drawing,geometry,places`;
        script.async = true;
        script.onload = initMap;
        document.head.appendChild(script);
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

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopTracking();
            clearPanelMarkers();
        };
    }, [stopTracking, clearPanelMarkers]);

    // No API key fallback
    if (!GMAPS_KEY) {
        return (
            <div style={{
                width: '100%', height: '100%',
                background: 'linear-gradient(135deg, #0a1520 0%, #0f2340 50%, #0a1520 100%)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 16,
            }}>
                <div style={{
                    textAlign: 'center', zIndex: 1, padding: 32,
                    background: 'rgba(2,6,23,0.85)', borderRadius: 16,
                    border: '1px solid rgba(59,130,246,0.2)',
                    maxWidth: 460,
                }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>   </div>
                    <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                        Live Satellite Map View
                    </p>
                    <p style={{ color: '#64748b', fontSize: 12, lineHeight: 1.6, marginBottom: 16 }}>
                        Add <code style={{ color: '#fbbf24', background: 'rgba(245,158,11,0.1)', padding: '1px 6px', borderRadius: 4 }}>REACT_APP_GOOGLE_MAPS_API_KEY</code> to your <code style={{ color: '#fbbf24' }}>.env</code> file.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {/* Map Container */}
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

            {/* Floating Control Panel */}
            <div style={{
                position: 'absolute',
                top: 16,
                left: 16,
                background: 'rgba(2,6,23,0.95)',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.1)',
                padding: 12,
                minWidth: 250,
                backdropFilter: 'blur(12px)',
                zIndex: 10,
            }}>
                <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>
                           Live Location Control
                    </h3>

                    {/* Live Tracking Button */}
                    <button
                        onClick={isTracking ? stopTracking : startTracking}
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: isTracking ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.1)',
                            background: isTracking ? 'rgba(34,197,94,0.2)' : 'rgba(59,130,246,0.2)',
                            color: isTracking ? '#22c55e' : '#3b82f6',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                        }}
                    >
                        {isTracking ? (
                            <><StopCircle size={16} /> Stop Live Tracking</>
                        ) : (
                            <><Play size={16} /> Start Live Tracking</>
                        )}
                    </button>

                    {/* Current Location Display */}
                    {currentLocation && (
                        <div style={{
                            marginTop: 8,
                            padding: '6px 10px',
                            borderRadius: 6,
                            background: 'rgba(34,197,94,0.1)',
                            border: '1px solid rgba(34,197,94,0.3)',
                            fontSize: 10,
                            color: '#94a3b8',
                            fontFamily: 'monospace',
                        }}>
                            <div>Lat: {currentLocation.lat.toFixed(6)}</div>
                            <div>Lng: {currentLocation.lng.toFixed(6)}</div>
                            <div>Accuracy:  {currentLocation.accuracy.toFixed(0)}m</div>
                        </div>
                    )}
                </div>

                {/* Boundary Selection */}
                <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>
                            Boundary Selection
                    </h3>
                    <button
                        onClick={() => {
                            setActiveTool('drawRoof');
                            if (drawingMgrRef.current) {
                                drawingMgrRef.current.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
                            }
                        }}
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid rgba(59,130,246,0.5)',
                            background: activeTool === 'drawRoof' ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.1)',
                            color: '#3b82f6',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                        }}
                    >
                        <Target size={16} /> Draw Roof Boundary
                    </button>
                    {selectedArea && (
                        <div style={{
                            marginTop: 8,
                            padding: '6px 10px',
                            borderRadius: 6,
                            background: 'rgba(34,197,94,0.1)',
                            fontSize: 10,
                            color: '#22c55e',
                        }}>
                              Boundary Selected
                        </div>
                    )}
                </div>

                {/* Manual Panel Placement */}
                {selectedArea && (
                    <div style={{ marginBottom: 12 }}>
                        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>
                              Panel Placement
                        </h3>

                        {/* Manual Mode Toggle */}
                        <button
                            onClick={() => setManualMode(!manualMode)}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: 8,
                                border: manualMode ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
                                background: manualMode ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
                                color: manualMode ? '#f59e0b' : '#94a3b8',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                marginBottom: 8,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                            }}
                        >
                            <Plus size={16} /> {manualMode ? 'Manual Mode ON' : 'Enable Manual Mode'}
                        </button>

                        {/* Grid Mode */}
                        <div style={{
                            padding: '8px 10px',
                            borderRadius: 8,
                            background: 'rgba(255,255,255,0.05)',
                            marginBottom: 8,
                        }}>
                            <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                                <Grid3x3 size={14} style={{ display: 'inline', marginRight: 4 }} />
                                Grid Layout
                            </label>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 2 }}>Rows</label>
                                    <input
                                        type="number"
                                        value={gridMode.rows}
                                        onChange={(e) => setGridMode({ ...gridMode, rows: parseInt(e.target.value) || 1 })}
                                        style={{
                                            width: '100%',
                                            padding: '4px 8px',
                                            borderRadius: 4,
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            background: 'rgba(255,255,255,0.05)',
                                            color: '#f1f5f9',
                                            fontSize: 11,
                                        }}
                                        min="1"
                                        max="20"
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 2 }}>Cols</label>
                                    <input
                                        type="number"
                                        value={gridMode.cols}
                                        onChange={(e) => setGridMode({ ...gridMode, cols: parseInt(e.target.value) || 1 })}
                                        style={{
                                            width: '100%',
                                            padding: '4px 8px',
                                            borderRadius: 4,
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            background: 'rgba(255,255,255,0.05)',
                                            color: '#f1f5f9',
                                            fontSize: 11,
                                        }}
                                        min="1"
                                        max="20"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={autoPlaceGrid}
                                style={{
                                    width: '100%',
                                    padding: '6px 12px',
                                    borderRadius: 6,
                                    border: '1px solid rgba(34,197,94,0.5)',
                                    background: 'rgba(34,197,94,0.2)',
                                    color: '#22c55e',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Auto-Place {gridMode.rows} {gridMode.cols} Grid
                            </button>
                        </div>

                        {/* Clear Panels */}
                        <button
                            onClick={clearPanelMarkers}
                            style={{
                                width: '100%',
                                padding: '6px 12px',
                                borderRadius: 6,
                                border: '1px solid rgba(239,68,68,0.5)',
                                background: 'rgba(239,68,68,0.1)',
                                color: '#ef4444',
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                            }}
                        >
                            <Trash2 size={14} /> Clear All Panels
                        </button>
                    </div>
                )}

                {/* Stats */}
                <div style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    background: 'rgba(255,255,255,0.03)',
                    fontSize: 10,
                    color: '#64748b',
                }}>
                    <div>Panels Placed: {panels.length}</div>
                    <div>Selected Roof: {selectedRoofId ? roofs.find(r => r.id === selectedRoofId)?.label : 'None'}</div>
                </div>
            </div>

            {/* Instructions Overlay */}
            {manualMode && selectedArea && (
                <div style={{
                    position: 'absolute',
                    bottom: 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(245,158,11,0.95)',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '8px 20px',
                    borderRadius: 20,
                    pointerEvents: 'none',
                    zIndex: 10,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}>
                        Click inside boundary to place solar panels
                </div>
            )}
        </div>
    );
};

export default Map2DEnhanced;

// Map2DIframe.js - Simple Google Maps using iframe (No API Key Required!)
import React, { useState, useCallback } from 'react';
import { useSolarStore } from './useSolarStore';
import { MapPin, Target, Grid3x3, Plus, Layers } from 'lucide-react';

const Map2DIframe = ({ lat = 21.1702, lng = 72.8311 }) => {
    const [mapCenter, setMapCenter] = useState({ lat, lng });
    const [zoom, setZoom] = useState(20);
    const [mapType, setMapType] = useState('satellite'); // 'roadmap' or 'satellite'
    const [showControls, setShowControls] = useState(true);

    const {
        addRoof, panels, selectedRoofId, roofs
    } = useSolarStore();

    // Generate Google Maps iframe URL
    const getMapUrl = useCallback(() => {
        const { lat, lng } = mapCenter;
        // Google Maps Embed URL (works without API key for basic viewing)
        return `https://www.google.com/maps/embed/v1/view?key=&center=${lat},${lng}&zoom=${zoom}&maptype=${mapType}`;
    }, [mapCenter, zoom, mapType]);

    // Alternative: Google Maps direct link (more reliable, no API key needed)
    const getDirectMapUrl = useCallback(() => {
        const { lat, lng } = mapCenter;
        // Direct Google Maps URL - works 100% without API key
        return `https://maps.google.com/maps?q=${lat},${lng}&t=${mapType === 'satellite' ? 'k' : 'm'}&z=${zoom}&output=embed`;
    }, [mapCenter, zoom, mapType]);

    // Quick preset locations (India solar hotspots)
    const presetLocations = [
        { name: 'Surat', lat: 21.1702, lng: 72.8311 },
        { name: 'Delhi NCR', lat: 28.54317, lng: 77.335763 },
        { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
        { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
        { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
        { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
        { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
        { name: 'Pune', lat: 18.5204, lng: 73.8567 },
    ];

    // Manual location input
    const [customLat, setCustomLat] = useState(lat.toString());
    const [customLng, setCustomLng] = useState(lng.toString());

    const goToLocation = () => {
        const parsedLat = parseFloat(customLat);
        const parsedLng = parseFloat(customLng);
        if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
            setMapCenter({ lat: parsedLat, lng: parsedLng });
        }
    };

    const goToPreset = (preset) => {
        setMapCenter({ lat: preset.lat, lng: preset.lng });
        setCustomLat(preset.lat.toString());
        setCustomLng(preset.lng.toString());
    };

    // Simulate adding roof at current location
    const addRoofAtLocation = () => {
        const roofData = {
            label: `Roof ${roofs.length + 1}`,
            points: [
                [mapCenter.lng - 0.0001, mapCenter.lat + 0.0001],
                [mapCenter.lng + 0.0001, mapCenter.lat + 0.0001],
                [mapCenter.lng + 0.0001, mapCenter.lat - 0.0001],
                [mapCenter.lng - 0.0001, mapCenter.lat - 0.0001],
            ],
            bounds: {
                minX: -10,
                maxX: 10,
                minY: -10,
                maxY: 10,
            },
            width: 20,
            depth: 20,
            area: 400,
            coordinates: [
                { lat: mapCenter.lat + 0.0001, lng: mapCenter.lng - 0.0001 },
                { lat: mapCenter.lat + 0.0001, lng: mapCenter.lng + 0.0001 },
                { lat: mapCenter.lat - 0.0001, lng: mapCenter.lng + 0.0001 },
                { lat: mapCenter.lat - 0.0001, lng: mapCenter.lng - 0.0001 },
            ],
            center: { lat: mapCenter.lat, lng: mapCenter.lng },
            height: 3,
        };

        addRoof(roofData);
        alert(`  Roof added at location!\nLat: ${mapCenter.lat.toFixed(6)}\nLng: ${mapCenter.lng.toFixed(6)}\n\nSwitch to 3D view to see it.`);
    };

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0a1520' }}>

            {/* Google Maps iframe */}
            <iframe
                src={getDirectMapUrl()}
                style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    filter: showControls ? 'none' : 'brightness(0.8)',
                }}
                title="Google Maps View"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
            />

            {/* Floating Control Panel */}
            {showControls && (
                <div style={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    background: 'rgba(2,6,23,0.98)',
                    borderRadius: 12,
                    border: '1px solid rgba(59,130,246,0.3)',
                    padding: 16,
                    minWidth: 280,
                    maxWidth: 320,
                    maxHeight: 'calc(100vh - 200px)',
                    overflowY: 'auto',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    zIndex: 1000,
                }}>

                    {/* Header */}
                    <div style={{
                        marginBottom: 16,
                        paddingBottom: 12,
                        borderBottom: '1px solid rgba(59,130,246,0.2)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: '#3b82f6',
                                margin: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                            }}>
                                <MapPin size={16} />
                                Google Maps (iframe)
                            </h3>
                            <button
                                onClick={() => setShowControls(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    fontSize: 18,
                                    padding: 0,
                                }}
                            >
                                 
                            </button>
                        </div>
                        <p style={{
                            fontSize: 11,
                            color: '#64748b',
                            margin: '4px 0 0 0',
                            lineHeight: 1.4,
                        }}>
                            No API key required!   
                        </p>
                    </div>

                    {/* Current Location */}
                    <div style={{ marginBottom: 16 }}>
                        <h4 style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#f1f5f9',
                            marginBottom: 8,
                        }}>
                               Current Location
                        </h4>
                        <div style={{
                            padding: '8px 10px',
                            borderRadius: 6,
                            background: 'rgba(59,130,246,0.1)',
                            border: '1px solid rgba(59,130,246,0.2)',
                            fontSize: 10,
                            color: '#94a3b8',
                            fontFamily: 'monospace',
                        }}>
                            <div>Lat: {mapCenter.lat.toFixed(6)}</div>
                            <div>Lng: {mapCenter.lng.toFixed(6)}</div>
                            <div>Zoom: {zoom}</div>
                        </div>
                    </div>

                    {/* Manual Coordinates */}
                    <div style={{ marginBottom: 16 }}>
                        <h4 style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#f1f5f9',
                            marginBottom: 8,
                        }}>
                               Go to Coordinates
                        </h4>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 4 }}>
                                    Latitude
                                </label>
                                <input
                                    type="text"
                                    value={customLat}
                                    onChange={(e) => setCustomLat(e.target.value)}
                                    placeholder="28.54317"
                                    style={{
                                        width: '100%',
                                        padding: '6px 8px',
                                        borderRadius: 4,
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: '#f1f5f9',
                                        fontSize: 11,
                                    }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 4 }}>
                                    Longitude
                                </label>
                                <input
                                    type="text"
                                    value={customLng}
                                    onChange={(e) => setCustomLng(e.target.value)}
                                    placeholder="77.335763"
                                    style={{
                                        width: '100%',
                                        padding: '6px 8px',
                                        borderRadius: 4,
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: '#f1f5f9',
                                        fontSize: 11,
                                    }}
                                />
                            </div>
                        </div>
                        <button
                            onClick={goToLocation}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: 6,
                                border: '1px solid rgba(34,197,94,0.5)',
                                background: 'rgba(34,197,94,0.2)',
                                color: '#22c55e',
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                            }}
                        >
                            <Target size={14} /> Go to Location
                        </button>
                    </div>

                    {/* Preset Locations */}
                    <div style={{ marginBottom: 16 }}>
                        <h4 style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#f1f5f9',
                            marginBottom: 8,
                        }}>
                               Quick Locations (India)
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                            {presetLocations.map((preset, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => goToPreset(preset)}
                                    style={{
                                        padding: '6px 10px',
                                        borderRadius: 6,
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: '#94a3b8',
                                        fontSize: 10,
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.background = 'rgba(59,130,246,0.2)';
                                        e.target.style.color = '#3b82f6';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.background = 'rgba(255,255,255,0.05)';
                                        e.target.style.color = '#94a3b8';
                                    }}
                                >
                                    {preset.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Map Controls */}
                    <div style={{ marginBottom: 16 }}>
                        <h4 style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#f1f5f9',
                            marginBottom: 8,
                        }}>
                                Map View
                        </h4>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                            <button
                                onClick={() => setMapType('satellite')}
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    borderRadius: 6,
                                    border: mapType === 'satellite' ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                                    background: mapType === 'satellite' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                                    color: mapType === 'satellite' ? '#3b82f6' : '#94a3b8',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                    Satellite
                            </button>
                            <button
                                onClick={() => setMapType('roadmap')}
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    borderRadius: 6,
                                    border: mapType === 'roadmap' ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                                    background: mapType === 'roadmap' ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                                    color: mapType === 'roadmap' ? '#3b82f6' : '#94a3b8',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                    Map
                            </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <label style={{ fontSize: 11, color: '#64748b', minWidth: 60 }}>
                                Zoom: {zoom}
                            </label>
                            <input
                                type="range"
                                min="10"
                                max="21"
                                value={zoom}
                                onChange={(e) => setZoom(parseInt(e.target.value))}
                                style={{
                                    flex: 1,
                                    accentColor: '#3b82f6',
                                }}
                            />
                        </div>
                    </div>

                    {/* Add Roof Action */}
                    <div style={{ marginBottom: 16 }}>
                        <h4 style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#f1f5f9',
                            marginBottom: 8,
                        }}>
                               Solar Roof
                        </h4>
                        <button
                            onClick={addRoofAtLocation}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: 8,
                                border: '1px solid rgba(245,158,11,0.5)',
                                background: 'rgba(245,158,11,0.2)',
                                color: '#f59e0b',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                            }}
                        >
                            <Plus size={16} /> Add Roof at This Location
                        </button>
                        <p style={{
                            fontSize: 10,
                            color: '#64748b',
                            marginTop: 6,
                            lineHeight: 1.4,
                        }}>
                            Creates a 20m 20m roof at map center. Switch to 3D view to customize.
                        </p>
                    </div>

                    {/* Stats */}
                    <div style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)',
                    }}>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                            <strong style={{ color: '#f1f5f9' }}>Roofs:</strong> {roofs.length}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                            <strong style={{ color: '#f1f5f9' }}>Panels:</strong> {panels.length}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                            <strong style={{ color: '#f1f5f9' }}>Selected:</strong> {selectedRoofId || 'None'}
                        </div>
                    </div>

                    {/* Instructions */}
                    <div style={{
                        marginTop: 12,
                        padding: '8px 10px',
                        borderRadius: 6,
                        background: 'rgba(59,130,246,0.1)',
                        border: '1px solid rgba(59,130,246,0.2)',
                    }}>
                        <p style={{
                            fontSize: 10,
                            color: '#94a3b8',
                            margin: 0,
                            lineHeight: 1.5,
                        }}>
                               <strong>Tip:</strong> Use Google Maps in iframe for viewing. For advanced features (panel placement on map), use Map2DEnhanced with API key.
                        </p>
                    </div>
                </div>
            )}

            {/* Show Controls Button (when hidden) */}
            {!showControls && (
                <button
                    onClick={() => setShowControls(true)}
                    style={{
                        position: 'absolute',
                        top: 16,
                        left: 16,
                        background: 'rgba(2,6,23,0.98)',
                        borderRadius: 8,
                        border: '1px solid rgba(59,130,246,0.3)',
                        padding: '10px 14px',
                        color: '#3b82f6',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        zIndex: 1000,
                    }}
                >
                    <Layers size={16} /> Show Controls
                </button>
            )}

            {/* Crosshair in center */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                zIndex: 100,
            }}>
                <div style={{
                    width: 30,
                    height: 30,
                    border: '2px solid #f59e0b',
                    borderRadius: '50%',
                    background: 'rgba(245,158,11,0.1)',
                    position: 'relative',
                }}>
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: 8,
                        height: 8,
                        background: '#f59e0b',
                        borderRadius: '50%',
                        transform: 'translate(-50%, -50%)',
                    }} />
                </div>
            </div>

            {/* Coordinates at bottom */}
            <div style={{
                position: 'absolute',
                bottom: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(2,6,23,0.95)',
                borderRadius: 8,
                border: '1px solid rgba(59,130,246,0.3)',
                padding: '8px 16px',
                fontSize: 11,
                color: '#94a3b8',
                fontFamily: 'monospace',
                zIndex: 100,
                backdropFilter: 'blur(8px)',
            }}>
                   Center: {mapCenter.lat.toFixed(5)}, {mapCenter.lng.toFixed(5)}
            </div>
        </div>
    );
};

export default Map2DIframe;

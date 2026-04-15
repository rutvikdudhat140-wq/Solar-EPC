// SurveyMap.js   Interactive Leaflet map with satellite imagery, boundary/exclusion drawing
// Uses: react-leaflet, leaflet-draw, ESRI World Imagery (free satellite tiles)
import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Tooltip, useMap, useMapEvents, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';
import { useSolarSurveyStore, calculateSunPosition, calculatePanelShadow } from './useSolarSurveyStore';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

//    Tile Layer URLs                                                            
const TILE_LAYERS = {
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; Esri, Maxar, Earthstar',
        maxZoom: 22,
    },
    hybrid: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; Esri',
        maxZoom: 22,
    },
    roadmap: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
    },
};

const HYBRID_LABELS = 'https://stamen-tiles.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}.png';

//    Solar Panel Rectangles on Map                                              
const PanelOverlays = React.memo(({ panels, showShadows, sunSimulation }) => {
    const sunPos = sunSimulation.enabled
        ? calculateSunPosition(sunSimulation.hour, sunSimulation.dayOfYear, sunSimulation.latitude)
        : null;

    return (
        <>
            {panels.map((panel) => {
                // Panel rectangle corners in lat/lng
                const hw = panel.width / 2;
                const hh = panel.height / 2;
                const mPerDegLat = 110540;
                const mPerDegLng = 111320 * Math.cos(panel.lat * (Math.PI / 180));

                const corners = [
                    { lat: panel.lat - hh / mPerDegLat, lng: panel.lng - hw / mPerDegLng },
                    { lat: panel.lat - hh / mPerDegLat, lng: panel.lng + hw / mPerDegLng },
                    { lat: panel.lat + hh / mPerDegLat, lng: panel.lng + hw / mPerDegLng },
                    { lat: panel.lat + hh / mPerDegLat, lng: panel.lng - hw / mPerDegLng },
                ];

                // Color based on shade factor
                let panelColor = '#1e3a5f';
                let opacity = 0.85;
                if (panel.shaded) {
                    const sf = panel.shadeFactor;
                    if (sf < 0.4) { panelColor = '#7f1d1d'; opacity = 0.8; }
                    else if (sf < 0.7) { panelColor = '#92400e'; opacity = 0.75; }
                    else { panelColor = '#1e3a5f'; opacity = 0.7; }
                }

                // Shadow polygon
                let shadowCorners = null;
                if (showShadows && sunPos && sunPos.altitude > 2) {
                    const shadowInfo = calculatePanelShadow(panel, sunPos, 0.5);
                    if (shadowInfo) {
                        shadowCorners = corners.map(c => ({
                            lat: c.lat + shadowInfo.dy / mPerDegLat,
                            lng: c.lng + shadowInfo.dx / mPerDegLng,
                        }));
                    }
                }

                return (
                    <React.Fragment key={panel.id}>
                        {shadowCorners && (
                            <Polygon
                                positions={shadowCorners.map(c => [c.lat, c.lng])}
                                pathOptions={{
                                    color: 'transparent',
                                    fillColor: '#000000',
                                    fillOpacity: 0.25,
                                    weight: 0,
                                }}
                            />
                        )}
                        <Polygon
                            positions={corners.map(c => [c.lat, c.lng])}
                            pathOptions={{
                                color: '#60a5fa',
                                fillColor: panelColor,
                                fillOpacity: opacity,
                                weight: 0.5,
                            }}
                        />
                    </React.Fragment>
                );
            })}
        </>
    );
});

//    Measurement Line                                                           
const MeasurementOverlay = () => {
    const { measurePoints, measureDistance } = useSolarSurveyStore();
    if (measurePoints.length < 1) return null;

    const positions = measurePoints.map(p => [p.lat, p.lng]);
    return (
        <>
            <Polyline
                positions={positions}
                pathOptions={{ color: '#f59e0b', weight: 3, dashArray: '8, 8' }}
            />
            {measurePoints.map((p, i) => (
                <Marker key={i} position={[p.lat, p.lng]}>
                    <Tooltip permanent direction="top" offset={[0, -10]}>
                        <span style={{ fontSize: 11, fontWeight: 700 }}>
                            {i === measurePoints.length - 1 && measureDistance > 0
                                ? `${measureDistance.toFixed(2)}m`
                                : `P${i + 1}`}
                        </span>
                    </Tooltip>
                </Marker>
            ))}
        </>
    );
};

//    Drawing Controller                                                         
const DrawingController = () => {
    const map = useMap();
    const drawControlRef = useRef(null);
    const drawnItemsRef = useRef(null);
    const { activeTool, addBoundary, addExclusionZone, selectedBoundaryId, addMeasurePoint, clearMeasure } = useSolarSurveyStore();

    useEffect(() => {
        if (!map) return;

        // Initialize drawn items layer
        if (!drawnItemsRef.current) {
            drawnItemsRef.current = new L.FeatureGroup();
            map.addLayer(drawnItemsRef.current);
        }

        // Clean up previous draw control
        if (drawControlRef.current) {
            map.removeControl(drawControlRef.current);
            drawControlRef.current = null;
        }

        if (activeTool === 'drawBoundary' || activeTool === 'drawExclusion') {
            const isExclusion = activeTool === 'drawExclusion';

            const drawControl = new L.Control.Draw({
                position: 'topleft',
                draw: {
                    polygon: {
                        allowIntersection: false,
                        showArea: true,
                        shapeOptions: {
                            color: isExclusion ? '#ef4444' : '#3b82f6',
                            fillColor: isExclusion ? '#ef4444' : '#3b82f6',
                            fillOpacity: isExclusion ? 0.3 : 0.2,
                            weight: 2,
                        },
                        drawError: {
                            color: '#ef4444',
                        },
                    },
                    rectangle: {
                        shapeOptions: {
                            color: isExclusion ? '#ef4444' : '#3b82f6',
                            fillColor: isExclusion ? '#ef4444' : '#3b82f6',
                            fillOpacity: isExclusion ? 0.3 : 0.2,
                            weight: 2,
                        },
                    },
                    polyline: false,
                    circle: false,
                    circlemarker: false,
                    marker: false,
                },
                edit: false,
            });

            map.addControl(drawControl);
            drawControlRef.current = drawControl;

            // Auto-start polygon drawing
            const handler = new L.Draw.Polygon(map, drawControl.options.draw.polygon);
            handler.enable();
        }

        // Handle draw:created event
        const onCreated = (e) => {
            const layer = e.layer;
            let latlngs;

            // Handle both polygon and rectangle
            if (layer instanceof L.Rectangle) {
                const bounds = layer.getBounds();
                latlngs = [
                    { lat: bounds.getSouthWest().lat, lng: bounds.getSouthWest().lng },
                    { lat: bounds.getSouthWest().lat, lng: bounds.getNorthEast().lng },
                    { lat: bounds.getNorthEast().lat, lng: bounds.getNorthEast().lng },
                    { lat: bounds.getNorthEast().lat, lng: bounds.getSouthWest().lng },
                ];
            } else {
                const rawLatLngs = layer.getLatLngs();
                const pts = Array.isArray(rawLatLngs[0]) ? rawLatLngs[0] : rawLatLngs;
                latlngs = pts.map(ll => ({ lat: ll.lat, lng: ll.lng }));
            }

            // Read current tool from store (avoids stale closure)
            const currentTool = useSolarSurveyStore.getState().activeTool;
            const currentBoundaryId = useSolarSurveyStore.getState().selectedBoundaryId;

            if (currentTool === 'drawExclusion' && currentBoundaryId) {
                addExclusionZone(latlngs, currentBoundaryId, 'obstacle');
            } else {
                addBoundary(latlngs);
            }

            // Remove the drawn layer (we render our own)
            if (drawnItemsRef.current) {
                drawnItemsRef.current.clearLayers();
            }
        };

        map.on(L.Draw.Event.CREATED, onCreated);

        return () => {
            map.off(L.Draw.Event.CREATED, onCreated);
            if (drawControlRef.current) {
                map.removeControl(drawControlRef.current);
                drawControlRef.current = null;
            }
        };
    }, [map, activeTool, addBoundary, addExclusionZone, selectedBoundaryId, addMeasurePoint, clearMeasure]);

    return null;
};

//    Map Click Handler                                                          
const MapClickHandler = () => {
    const { activeTool, addMeasurePoint } = useSolarSurveyStore();

    useMapEvents({
        click: (e) => {
            if (activeTool === 'measure') {
                addMeasurePoint({ lat: e.latlng.lat, lng: e.latlng.lng });
            }
        },
    });

    return null;
};

//    Map State Sync                                                             
const MapStateSync = () => {
    const map = useMap();
    const { setMapCenter, setMapZoom } = useSolarSurveyStore();

    useMapEvents({
        moveend: () => {
            const center = map.getCenter();
            setMapCenter({ lat: center.lat, lng: center.lng });
        },
        zoomend: () => {
            setMapZoom(map.getZoom());
        },
    });

    return null;
};

//    Fly-to when center changes                                                 
const MapFlyTo = ({ center, zoom }) => {
    const map = useMap();
    const prevCenter = useRef(center);

    useEffect(() => {
        if (center.lat !== prevCenter.current.lat || center.lng !== prevCenter.current.lng) {
            map.flyTo([center.lat, center.lng], zoom, { duration: 1.5 });
            prevCenter.current = center;
        }
    }, [center, zoom, map]);

    return null;
};

//    Exclusion Zone Visual                                                      
const ExclusionZoneOverlays = React.memo(() => {
    const { exclusionZones, selectedExclusionId, showExclusions } = useSolarSurveyStore();
    if (!showExclusions) return null;

    const typeColors = {
        obstacle: '#ef4444',
        shade: '#f59e0b',
        vent: '#8b5cf6',
        custom: '#6b7280',
    };

    return (
        <>
            {exclusionZones.map(zone => {
                const color = typeColors[zone.type] || '#ef4444';
                const isSelected = zone.id === selectedExclusionId;
                return (
                    <Polygon
                        key={zone.id}
                        positions={zone.latlngs.map(ll => [ll.lat, ll.lng])}
                        pathOptions={{
                            color: isSelected ? '#ffffff' : color,
                            fillColor: color,
                            fillOpacity: isSelected ? 0.5 : 0.35,
                            weight: isSelected ? 3 : 2,
                            dashArray: '6, 4',
                        }}
                        eventHandlers={{
                            click: () => useSolarSurveyStore.getState().selectExclusion(zone.id),
                        }}
                    >
                        <Tooltip sticky>
                            <div style={{ fontSize: 11 }}>
                                <strong>{zone.label}</strong><br />
                                {zone.area.toFixed(1)} m    {zone.type}
                            </div>
                        </Tooltip>
                    </Polygon>
                );
            })}
        </>
    );
});

//    Boundary Polygon Overlays                                                  
const BoundaryOverlays = React.memo(() => {
    const { boundaries, selectedBoundaryId, showLabels } = useSolarSurveyStore();

    return (
        <>
            {boundaries.map(boundary => {
                const isSelected = boundary.id === selectedBoundaryId;
                return (
                    <Polygon
                        key={boundary.id}
                        positions={boundary.latlngs.map(ll => [ll.lat, ll.lng])}
                        pathOptions={{
                            color: isSelected ? '#ffffff' : boundary.color,
                            fillColor: boundary.color,
                            fillOpacity: isSelected ? 0.2 : 0.12,
                            weight: isSelected ? 3 : 2,
                        }}
                        eventHandlers={{
                            click: () => useSolarSurveyStore.getState().selectBoundary(boundary.id),
                        }}
                    >
                        {showLabels && (
                            <Tooltip permanent direction="center">
                                <div style={{ fontSize: 11, fontWeight: 700, textAlign: 'center' }}>
                                    {boundary.name}<br />
                                    <span style={{ fontWeight: 400, fontSize: 10, color: '#666' }}>
                                        {boundary.area.toFixed(1)} m 
                                    </span>
                                </div>
                            </Tooltip>
                        )}
                    </Polygon>
                );
            })}
        </>
    );
});

//                                                                               
// MAIN SURVEY MAP COMPONENT
//                                                                               
const SurveyMap = () => {
    const {
        mapCenter, mapZoom, mapType,
        panels, showShadows, sunSimulation,
        activeTool,
    } = useSolarSurveyStore();

    const tileConfig = TILE_LAYERS[mapType] || TILE_LAYERS.satellite;

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <MapContainer
                center={[mapCenter.lat, mapCenter.lng]}
                zoom={mapZoom}
                maxZoom={22}
                style={{ width: '100%', height: '100%', background: '#0a1520' }}
                zoomControl={false}
                attributionControl={false}
            >
                <ZoomControl position="bottomright" />
                <TileLayer
                    url={tileConfig.url}
                    attribution={tileConfig.attribution}
                    maxZoom={tileConfig.maxZoom}
                    maxNativeZoom={tileConfig.maxZoom}
                />
                {mapType === 'hybrid' && (
                    <TileLayer url={HYBRID_LABELS} maxZoom={20} opacity={0.7} />
                )}

                {/* Overlays */}
                <BoundaryOverlays />
                <ExclusionZoneOverlays />
                <PanelOverlays panels={panels} showShadows={showShadows} sunSimulation={sunSimulation} />
                <MeasurementOverlay />

                {/* Controllers */}
                <DrawingController />
                <MapClickHandler />
                <MapStateSync />
                <MapFlyTo center={mapCenter} zoom={mapZoom} />
            </MapContainer>

            {/* Drawing mode indicator */}
            {(activeTool === 'drawBoundary' || activeTool === 'drawExclusion') && (
                <div style={{
                    position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                    background: activeTool === 'drawExclusion' ? 'rgba(239,68,68,0.95)' : 'rgba(59,130,246,0.95)',
                    color: '#fff', padding: '8px 20px', borderRadius: 8,
                    fontSize: 12, fontWeight: 700, zIndex: 1000,
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                    display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    <span style={{ fontSize: 16 }}>
                        {activeTool === 'drawExclusion' ? '  ' : '  '}
                    </span>
                    {activeTool === 'drawExclusion'
                        ? 'Click to draw exclusion zone   click first point to close'
                        : 'Click to draw boundary   click first point to close'}
                    <button
                        onClick={() => useSolarSurveyStore.getState().setActiveTool('select')}
                        style={{
                            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 4,
                            padding: '2px 8px', color: '#fff', fontSize: 11, cursor: 'pointer',
                            marginLeft: 8,
                        }}
                    >
                        Cancel (Esc)
                    </button>
                </div>
            )}

            {activeTool === 'measure' && (
                <div style={{
                    position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(245,158,11,0.95)', color: '#000',
                    padding: '8px 20px', borderRadius: 8,
                    fontSize: 12, fontWeight: 700, zIndex: 1000,
                    display: 'flex', alignItems: 'center', gap: 8,
                }}>
                       Click points to measure distance
                    <button
                        onClick={() => {
                            useSolarSurveyStore.getState().clearMeasure();
                            useSolarSurveyStore.getState().setActiveTool('select');
                        }}
                        style={{
                            background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: 4,
                            padding: '2px 8px', color: '#000', fontSize: 11, cursor: 'pointer',
                        }}
                    >
                        Done
                    </button>
                </div>
            )}

            {/* Crosshair */}
            <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none', zIndex: 500,
            }}>
                <svg width="40" height="40" viewBox="0 0 40 40">
                    <line x1="20" y1="0" x2="20" y2="16" stroke="#fff" strokeWidth="1.5" opacity="0.6" />
                    <line x1="20" y1="24" x2="20" y2="40" stroke="#fff" strokeWidth="1.5" opacity="0.6" />
                    <line x1="0" y1="20" x2="16" y2="20" stroke="#fff" strokeWidth="1.5" opacity="0.6" />
                    <line x1="24" y1="20" x2="40" y2="20" stroke="#fff" strokeWidth="1.5" opacity="0.6" />
                    <circle cx="20" cy="20" r="3" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.7" />
                </svg>
            </div>
        </div>
    );
};

export default SurveyMap;

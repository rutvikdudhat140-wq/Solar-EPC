// EnhancedMapView.js — Advanced 2D/3D map integration with smooth transitions
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useSolarSurveyStore } from './useSolarSurveyStore';

// Map transition utilities
const TRANSITION_DURATION = 800; // ms

const EnhancedMapView = ({
    lat = 28.54317,
    lng = 77.335763,
    onTransitionTo3D
}) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const drawingManagerRef = useRef(null);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const {
        areas,
        exclusionZones,
        activeTool,
        setActiveTool,
        addArea,
        addExclusionZone,
        viewMode,
        setViewMode,
        selectedAreaId,
        setSelectedArea
    } = useSolarSurveyStore();

    // Initialize Google Maps with enhanced features
    const initializeMap = useCallback(() => {
        if (!window.google || !mapRef.current || mapInstanceRef.current) return;

        const mapOptions = {
            center: { lat, lng },
            zoom: 20,
            mapTypeId: 'hybrid', // Start with hybrid for better context
            tilt: 0,
            mapTypeControl: true,
            mapTypeControlOptions: {
                position: window.google.maps.ControlPosition.TOP_RIGHT,
                mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain']
            },
            zoomControl: true,
            zoomControlOptions: {
                position: window.google.maps.ControlPosition.RIGHT_CENTER
            },
            streetViewControl: true,
            streetViewControlOptions: {
                position: window.google.maps.ControlPosition.RIGHT_TOP
            },
            fullscreenControl: true,
            gestureHandling: 'greedy',
            // Enhanced visual settings
            styles: [
                {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                },
                {
                    featureType: 'transit',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                }
            ]
        };

        const map = new window.google.maps.Map(mapRef.current, mapOptions);
        mapInstanceRef.current = map;

        // Initialize Drawing Manager with enhanced options
        const drawingManager = new window.google.maps.drawing.DrawingManager({
            drawingMode: null,
            drawingControl: false,
            polygonOptions: {
                fillColor: '#3b82f6',
                fillOpacity: 0.3,
                strokeWeight: 2,
                strokeColor: '#1d4ed8',
                clickable: true,
                editable: true,
                draggable: false,
                geodesic: false,
            },
            rectangleOptions: {
                fillColor: '#10b981',
                fillOpacity: 0.3,
                strokeWeight: 2,
                strokeColor: '#047857',
                clickable: true,
                editable: true,
                draggable: false,
            },
            circleOptions: {
                fillColor: '#f59e0b',
                fillOpacity: 0.3,
                strokeWeight: 2,
                strokeColor: '#d97706',
                clickable: true,
                editable: true,
                draggable: false,
            }
        });

        drawingManager.setMap(map);
        drawingManagerRef.current = drawingManager;

        // Enhanced area creation handler
        const handleAreaComplete = (shape, type) => {
            let coordinates = [];
            let center = null;
            let area = 0;

            if (type === 'polygon') {
                const path = shape.getPath();
                coordinates = [];
                for (let i = 0; i < path.getLength(); i++) {
                    const point = path.getAt(i);
                    coordinates.push({ lat: point.lat(), lng: point.lng() });
                }

                // Calculate centroid
                const bounds = new window.google.maps.LatLngBounds();
                coordinates.forEach(coord => bounds.extend(coord));
                center = bounds.getCenter();

                // Calculate area using spherical geometry
                area = window.google.maps.geometry.sphericalGeometry.computeArea(path);
            } else if (type === 'rectangle') {
                const bounds = shape.getBounds();
                const ne = bounds.getNorthEast();
                const sw = bounds.getSouthWest();
                coordinates = [
                    { lat: ne.lat(), lng: sw.lng() },
                    { lat: ne.lat(), lng: ne.lng() },
                    { lat: sw.lat(), lng: ne.lng() },
                    { lat: sw.lat(), lng: sw.lng() }
                ];
                center = bounds.getCenter();
                area = window.google.maps.geometry.sphericalGeometry.computeArea(
                    new window.google.maps.Polygon({ paths: coordinates }).getPath()
                );
            } else if (type === 'circle') {
                const centerPoint = shape.getCenter();
                const radius = shape.getRadius();
                center = centerPoint;
                area = Math.PI * radius * radius;

                // Convert circle to polygon approximation
                coordinates = [];
                const numPoints = 32;
                for (let i = 0; i < numPoints; i++) {
                    const angle = (i / numPoints) * 2 * Math.PI;
                    const lat = centerPoint.lat() + (radius / 111320) * Math.cos(angle) / Math.cos(centerPoint.lat() * Math.PI / 180);
                    const lng = centerPoint.lng() + (radius / 111320) * Math.sin(angle);
                    coordinates.push({ lat, lng });
                }
            }

            // Create area object
            const newArea = {
                id: `area_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: `Area ${areas.length + 1}`,
                type: activeTool === 'draw-area' ? 'roof' : 'exclusion',
                coordinates,
                center: { lat: center.lat(), lng: center.lng() },
                area: area, // in square meters
                height: 3, // default building height
                tilt: 15, // default panel tilt
                created: new Date().toISOString()
            };

            if (activeTool === 'draw-area') {
                addArea(newArea);
            } else if (activeTool === 'exclude-area') {
                addExclusionZone({
                    ...newArea,
                    type: 'exclusion',
                    areaId: selectedAreaId || null
                });
            }

            // Remove the temporary shape
            shape.setMap(null);
            setActiveTool(null);
        };

        // Event listeners for drawing completion
        drawingManager.addListener('polygoncomplete', (polygon) => {
            handleAreaComplete(polygon, 'polygon');
        });

        drawingManager.addListener('rectanglecomplete', (rectangle) => {
            handleAreaComplete(rectangle, 'rectangle');
        });

        drawingManager.addListener('circlecomplete', (circle) => {
            handleAreaComplete(circle, 'circle');
        });

        // Zoom change handler for 3D transition trigger
        map.addListener('zoom_changed', () => {
            const zoom = map.getZoom();
            if (zoom >= 22 && viewMode === '2D') {
                // Auto-trigger 3D transition at high zoom levels
                setTimeout(() => {
                    if (onTransitionTo3D) {
                        onTransitionTo3D();
                    }
                }, 500);
            }
        });

        // Right-click context menu for quick actions
        map.addListener('rightclick', (event) => {
            showContextMenu(event.latLng, event.pixel);
        });

    }, [lat, lng, activeTool, areas.length, selectedAreaId, viewMode, onTransitionTo3D, addArea, addExclusionZone, setActiveTool]);

    // Context menu for quick actions
    const showContextMenu = (latLng, pixel) => {
        // Create context menu (simplified version)
        const contextMenu = document.createElement('div');
        contextMenu.style.position = 'absolute';
        contextMenu.style.left = `${pixel.x}px`;
        contextMenu.style.top = `${pixel.y}px`;
        contextMenu.style.background = 'var(--bg-surface)';
        contextMenu.style.border = '1px solid var(--border-base)';
        contextMenu.style.borderRadius = '4px';
        contextMenu.style.padding = '8px';
        contextMenu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        contextMenu.style.zIndex = '1000';
        contextMenu.innerHTML = `
            <div style="cursor: pointer; padding: 4px 8px;" onclick="this.parentElement.remove()">Measure Distance</div>
            <div style="cursor: pointer; padding: 4px 8px;" onclick="this.parentElement.remove()">Add Marker</div>
            <div style="cursor: pointer; padding: 4px 8px;" onclick="this.parentElement.remove()">Switch to 3D</div>
        `;
        document.body.appendChild(contextMenu);

        // Remove context menu when clicking elsewhere
        setTimeout(() => {
            document.addEventListener('click', () => {
                if (document.body.contains(contextMenu)) {
                    document.body.removeChild(contextMenu);
                }
            }, { once: true });
        }, 100);
    };

    // Update drawing mode based on active tool
    useEffect(() => {
        if (!drawingManagerRef.current) return;

        const drawingManager = drawingManagerRef.current;

        switch (activeTool) {
            case 'draw-area':
                drawingManager.setDrawingMode(window.google.maps.drawing.OverlayType.POLYGON);
                break;
            case 'draw-rectangle':
                drawingManager.setDrawingMode(window.google.maps.drawing.OverlayType.RECTANGLE);
                break;
            case 'exclude-area':
                drawingManager.setDrawingMode(window.google.maps.drawing.OverlayType.CIRCLE);
                break;
            default:
                drawingManager.setDrawingMode(null);
        }
    }, [activeTool]);

    // Smooth zoom transition
    const smoothZoomTo = useCallback((targetZoom, duration = 800) => {
        if (!mapInstanceRef.current) return;

        const map = mapInstanceRef.current;
        const startZoom = map.getZoom();
        const zoomDiff = targetZoom - startZoom;
        const steps = duration / 16; // ~60fps
        let currentStep = 0;

        const animate = () => {
            if (currentStep >= steps) return;

            const progress = currentStep / steps;
            const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
            const currentZoom = startZoom + (zoomDiff * easeProgress);

            map.setZoom(currentZoom);
            currentStep++;
            requestAnimationFrame(animate);
        };

        animate();
    }, []);

    // Enhanced map transition to 3D
    const transitionTo3D = useCallback(() => {
        if (isTransitioning || !mapInstanceRef.current) return;

        setIsTransitioning(true);
        const map = mapInstanceRef.current;

        // Smooth zoom out then trigger 3D transition
        smoothZoomTo(18, 400);

        setTimeout(() => {
            setViewMode('3D');
            setIsTransitioning(false);
        }, TRANSITION_DURATION);
    }, [isTransitioning, smoothZoomTo, setViewMode]);

    // Load Google Maps API
    useEffect(() => {
        const loadGoogleMaps = async () => {
            if (window.google) {
                initializeMap();
                return;
            }

            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=drawing,geometry&callback=initGoogleMaps`;
            script.async = true;
            script.defer = true;

            window.initGoogleMaps = () => {
                initializeMap();
                delete window.initGoogleMaps;
            };

            document.head.appendChild(script);
        };

        loadGoogleMaps();
    }, [initializeMap]);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {/* Map Container */}
            <div
                ref={mapRef}
                style={{
                    width: '100%',
                    height: '100%',
                    transition: `opacity ${TRANSITION_DURATION}ms ease-in-out`,
                    opacity: isTransitioning ? 0.5 : 1
                }}
            />

            {/* Enhanced Map Controls */}
            <div style={{
                position: 'absolute',
                top: 16,
                left: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                zIndex: 10
            }}>
                {/* 3D Transition Button */}
                <button
                    onClick={transitionTo3D}
                    disabled={isTransitioning}
                    style={{
                        padding: '8px 12px',
                        background: 'rgba(59, 130, 246, 0.9)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: isTransitioning ? 'not-allowed' : 'pointer',
                        backdropFilter: 'blur(8px)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        opacity: isTransitioning ? 0.5 : 1
                    }}
                >
                    {isTransitioning ? 'Transitioning...' : '🎯 Switch to 3D'}
                </button>

                {/* Quick Tool Buttons */}
                <div style={{ display: 'flex', gap: 4 }}>
                    <button
                        onClick={() => setActiveTool(activeTool === 'draw-area' ? null : 'draw-area')}
                        style={{
                            padding: '6px 8px',
                            background: activeTool === 'draw-area' ? 'rgba(34, 197, 94, 0.9)' : 'rgba(55, 65, 81, 0.9)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            backdropFilter: 'blur(8px)'
                        }}
                    >
                        📐 Area
                    </button>
                    <button
                        onClick={() => setActiveTool(activeTool === 'exclude-area' ? null : 'exclude-area')}
                        style={{
                            padding: '6px 8px',
                            background: activeTool === 'exclude-area' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(55, 65, 81, 0.9)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            backdropFilter: 'blur(8px)'
                        }}
                    >
                        🚫 Exclude
                    </button>
                </div>
            </div>

            {/* Area Information Panel */}
            {areas.length > 0 && (
                <div style={{
                    position: 'absolute',
                    bottom: 16,
                    right: 16,
                    background: 'rgba(2, 6, 23, 0.92)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 8,
                    padding: '12px 16px',
                    backdropFilter: 'blur(10px)',
                    minWidth: 200,
                    maxWidth: 280,
                    zIndex: 10
                }}>
                    <div style={{
                        fontSize: 11,
                        color: '#64748b',
                        marginBottom: 8,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        Survey Areas ({areas.length})
                    </div>
                    {areas.slice(0, 3).map(area => (
                        <div key={area.id} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '4px 0',
                            fontSize: 12
                        }}>
                            <span style={{ color: '#f1f5f9' }}>{area.name}</span>
                            <span style={{
                                color: '#3b82f6',
                                fontFamily: 'monospace',
                                fontSize: 11
                            }}>
                                {(area.area / 1).toFixed(0)}m²
                            </span>
                        </div>
                    ))}
                    {areas.length > 3 && (
                        <div style={{
                            fontSize: 11,
                            color: '#64748b',
                            marginTop: 4,
                            textAlign: 'center'
                        }}>
                            +{areas.length - 3} more areas
                        </div>
                    )}
                </div>
            )}

            {/* Transition Overlay */}
            {isTransitioning && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 20
                }}>
                    <div style={{
                        background: 'rgba(2, 6, 23, 0.9)',
                        padding: '20px 32px',
                        borderRadius: 12,
                        backdropFilter: 'blur(12px)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>🚀</div>
                        <div style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600 }}>
                            Transitioning to 3D View...
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnhancedMapView;

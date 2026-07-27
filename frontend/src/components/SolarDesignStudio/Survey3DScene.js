// Survey3DScene.js   Full 3D visualization for solar survey
// Realistic panel layout, shadow analysis, smooth camera animations, architectural spacing
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sky, Grid, Html, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useSolarSurveyStore, calculateSunPosition } from './useSolarSurveyStore';

//    Sun Light System                                                           
const SunLightSystem = () => {
    const lightRef = useRef();
    const { sunSimulation, showShadows } = useSolarSurveyStore();

    useFrame(() => {
        if (!lightRef.current || !sunSimulation.enabled) return;
        const sunPos = calculateSunPosition(
            sunSimulation.hour, sunSimulation.dayOfYear, sunSimulation.latitude
        );
        const dist = 100;
        const x = dist * Math.cos(sunPos.altitudeRad) * Math.sin(sunPos.azimuthRad);
        const y = dist * Math.sin(sunPos.altitudeRad);
        const z = dist * Math.cos(sunPos.altitudeRad) * Math.cos(sunPos.azimuthRad);
        lightRef.current.position.set(x, Math.max(5, y), z);
    });

    const defaultPos = useMemo(() => {
        if (sunSimulation.enabled) {
            const sp = calculateSunPosition(sunSimulation.hour, sunSimulation.dayOfYear, sunSimulation.latitude);
            return [
                100 * Math.cos(sp.altitudeRad) * Math.sin(sp.azimuthRad),
                Math.max(5, 100 * Math.sin(sp.altitudeRad)),
                100 * Math.cos(sp.altitudeRad) * Math.cos(sp.azimuthRad),
            ];
        }
        return [60, 80, 40];
    }, [sunSimulation]);

    return (
        <>
            <directionalLight
                ref={lightRef}
                position={defaultPos}
                intensity={sunSimulation.enabled ? 2.0 : 1.6}
                castShadow={showShadows}
                shadow-mapSize={[4096, 4096]}
                shadow-camera-near={1}
                shadow-camera-far={400}
                shadow-camera-left={-100}
                shadow-camera-right={100}
                shadow-camera-top={100}
                shadow-camera-bottom={-100}
                shadow-bias={-0.0005}
            />
            <ambientLight intensity={0.3} />
            <hemisphereLight args={['#b1e1ff', '#6a8a5a', 0.4]} />
        </>
    );
};

//    Realistic Solar Panel                                                      
const SolarPanel = React.memo(({ position, size, tilt, azimuth, shaded, shadeFactor }) => {
    const meshRef = useRef();
    const tiltRad = (tilt || 15) * (Math.PI / 180);
    const azimuthRad = ((azimuth || 180) - 180) * (Math.PI / 180);

    // Panel materials
    const frameMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#2a2a2a',
        metalness: 0.8,
        roughness: 0.3,
    }), []);

    const cellColor = shaded
        ? (shadeFactor < 0.4 ? '#1a0505' : shadeFactor < 0.7 ? '#1a1005' : '#0a1a2e')
        : '#0a1a3a';

    const cellMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: cellColor,
        metalness: 0.95,
        roughness: 0.05,
        envMapIntensity: 2.5,
    }), [cellColor]);

    const gridMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#050f1a',
        metalness: 0.5,
        roughness: 0.5,
    }), []);

    const w = size?.width || 2.0;
    const h = size?.height || 1.0;

    return (
        <group position={position} rotation={[0, azimuthRad, 0]}>
            <group rotation={[tiltRad, 0, 0]}>
                {/* Frame */}
                <mesh castShadow receiveShadow material={frameMat}>
                    <boxGeometry args={[w, 0.04, h]} />
                </mesh>

                {/* Solar cells */}
                <mesh position={[0, 0.025, 0]} castShadow receiveShadow material={cellMat}>
                    <boxGeometry args={[w - 0.06, 0.005, h - 0.06]} />
                </mesh>

                {/* Cell grid lines   horizontal */}
                {Array.from({ length: 5 }, (_, i) => {
                    const z = -h / 2 + 0.03 + (i + 1) * ((h - 0.06) / 6);
                    return (
                        <mesh key={`h${i}`} position={[0, 0.028, z]} material={gridMat}>
                            <boxGeometry args={[w - 0.08, 0.003, 0.004]} />
                        </mesh>
                    );
                })}

                {/* Cell grid lines   vertical */}
                {Array.from({ length: 2 }, (_, i) => {
                    const x = -w / 2 + 0.03 + (i + 1) * ((w - 0.06) / 3);
                    return (
                        <mesh key={`v${i}`} position={[x, 0.028, 0]} material={gridMat}>
                            <boxGeometry args={[0.004, 0.003, h - 0.08]} />
                        </mesh>
                    );
                })}

                {/* Shade indicator overlay */}
                {shaded && (
                    <mesh position={[0, 0.032, 0]}>
                        <boxGeometry args={[w - 0.04, 0.001, h - 0.04]} />
                        <meshBasicMaterial color="#ff0000" transparent opacity={0.15 * (1 - shadeFactor)} />
                    </mesh>
                )}
            </group>

            {/* Support legs */}
            <mesh position={[-w / 2 + 0.15, -0.15, 0]} castShadow>
                <boxGeometry args={[0.03, 0.3, 0.03]} />
                <meshStandardMaterial color="#333" metalness={0.7} roughness={0.4} />
            </mesh>
            <mesh position={[w / 2 - 0.15, -0.15, 0]} castShadow>
                <boxGeometry args={[0.03, 0.3, 0.03]} />
                <meshStandardMaterial color="#333" metalness={0.7} roughness={0.4} />
            </mesh>
        </group>
    );
});

//    Boundary Building (3D roof surface)                                        
const BoundaryMesh = ({ boundary, isSelected, panels }) => {
    const points = boundary.localPoints;
    const h = boundary.height || 3.0;

    // Create shape from local points   all hooks must come before any early return
    const shape = useMemo(() => {
        if (!points || points.length < 3) return null;
        const s = new THREE.Shape();
        s.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            s.lineTo(points[i].x, points[i].y);
        }
        s.closePath();
        return s;
    }, [points]);

    // Extrude for building walls
    const buildingGeo = useMemo(() => {
        if (!shape) return null;
        return new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
    }, [shape, h]);

    // Roof surface (flat on top)
    const roofGeo = useMemo(() => {
        if (!shape) return null;
        return new THREE.ShapeGeometry(shape);
    }, [shape]);

    // Outline edges
    const outlinePoints = useMemo(() => {
        if (!points || points.length < 3) return [];
        return [...points, points[0]].map(p => new THREE.Vector3(p.x, h + 0.02, p.y));
    }, [points, h]);

    const lineObj = useMemo(() => {
        if (outlinePoints.length === 0) return null;
        const geo = new THREE.BufferGeometry().setFromPoints(outlinePoints);
        const mat = new THREE.LineBasicMaterial({ color: isSelected ? '#60a5fa' : (boundary.color || '#3b82f6'), linewidth: 2 });
        return new THREE.Line(geo, mat);
    }, [outlinePoints, isSelected, boundary.color]);

    if (!points || points.length < 3) return null;

    return (
        <group>
            {/* Building body */}
            <mesh geometry={buildingGeo} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
                <meshStandardMaterial
                    color={isSelected ? '#1a2a4a' : '#1a1a2a'}
                    roughness={0.85}
                    metalness={0.1}
                    transparent
                    opacity={0.9}
                />
            </mesh>

            {/* Roof surface */}
            <mesh geometry={roofGeo} position={[0, h + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <meshStandardMaterial
                    color={isSelected ? '#2a3a5a' : '#2a2a3a'}
                    roughness={0.7}
                    metalness={0.1}
                />
            </mesh>

            {/* Selection outline */}
            <primitive object={lineObj} />

            {/* Panels on this boundary */}
            {panels.map(panel => (
                <SolarPanel
                    key={panel.id}
                    position={[panel.localX, h + 0.32, panel.localY]}
                    size={{ width: panel.width, height: panel.height }}
                    tilt={panel.tilt}
                    azimuth={panel.azimuth}
                    shaded={panel.shaded}
                    shadeFactor={panel.shadeFactor}
                />
            ))}

            {/* Label */}
            <Html position={[0, h + 3, 0]} center>
                <div style={{
                    background: 'rgba(15,24,41,0.9)',
                    border: `2px solid ${isSelected ? '#60a5fa' : boundary.color || '#3b82f6'}`,
                    borderRadius: 8,
                    padding: '4px 12px',
                    color: '#e2e8f0',
                    fontSize: 11,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    backdropFilter: 'blur(4px)',
                }}>
                    {boundary.name}   {panels.length} panels
                    <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>
                        {boundary.area.toFixed(1)} m    {((panels.length * (panels[0]?.power || 545)) / 1000).toFixed(1)} kWp
                    </div>
                </div>
            </Html>
        </group>
    );
};

//    Exclusion Zone 3D                                                          
const ExclusionMesh = ({ zone, boundaryHeight }) => {
    const points = zone.localPoints;
    const obsHeight = zone.type === 'obstacle' ? 2.0 : zone.type === 'vent' ? 1.5 : 0.3;

    // All hooks before any early return
    const shape = useMemo(() => {
        if (!points || points.length < 3) return null;
        const s = new THREE.Shape();
        s.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            s.lineTo(points[i].x, points[i].y);
        }
        s.closePath();
        return s;
    }, [points]);

    const geo = useMemo(() => {
        if (!shape) return null;
        return new THREE.ExtrudeGeometry(shape, { depth: obsHeight, bevelEnabled: false });
    }, [shape, obsHeight]);

    if (!points || points.length < 3) return null;

    const typeColor = {
        obstacle: '#ef4444',
        shade: '#f59e0b',
        vent: '#8b5cf6',
        custom: '#6b7280',
    }[zone.type] || '#ef4444';

    return (
        <group>
            <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, boundaryHeight + 0.02, 0]} castShadow>
                <meshStandardMaterial
                    color={typeColor}
                    roughness={0.6}
                    metalness={0.2}
                    transparent
                    opacity={0.7}
                />
            </mesh>

            <Html position={[
                points.reduce((s, p) => s + p.x, 0) / points.length,
                boundaryHeight + obsHeight + 1.5,
                points.reduce((s, p) => s + p.y, 0) / points.length,
            ]} center>
                <div style={{
                    background: 'rgba(30,0,0,0.85)',
                    border: `1px solid ${typeColor}`,
                    borderRadius: 6,
                    padding: '2px 8px',
                    color: typeColor,
                    fontSize: 10,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                }}>
                       {zone.label}
                </div>
            </Html>
        </group>
    );
};

//    Ground Plane                                                               
const Ground = ({ showGrid }) => (
    <>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
            <planeGeometry args={[500, 500]} />
            <meshStandardMaterial color="#1a2510" roughness={1} />
        </mesh>
        {showGrid && (
            <Grid
                args={[200, 200]}
                position={[0, 0, 0]}
                cellSize={2}
                cellColor="#2a3a2a"
                sectionSize={10}
                sectionColor="#3a5a3a"
                fadeDistance={100}
                infiniteGrid
            />
        )}
    </>
);

//    Scene Content                                                              
const SceneContent = () => {
    const {
        boundaries, exclusionZones, panels,
        selectedBoundaryId, selectBoundary,
        showGrid, showShadows, show3DBuildings,
    } = useSolarSurveyStore();

    return (
        <>
            <Sky sunPosition={[100, 40, 80]} turbidity={3} rayleigh={0.5} />
            <SunLightSystem />
            <Ground showGrid={showGrid} />

            {showShadows && (
                <ContactShadows
                    position={[0, 0.01, 0]}
                    scale={200}
                    blur={2}
                    far={50}
                    opacity={0.4}
                />
            )}

            {boundaries.map(boundary => {
                const bPanels = panels.filter(p => p.boundaryId === boundary.id);
                const bExclusions = exclusionZones.filter(e => e.boundaryId === boundary.id);
                const isSelected = selectedBoundaryId === boundary.id;

                return (
                    <group key={boundary.id} onClick={(e) => { e.stopPropagation(); selectBoundary(boundary.id); }}>
                        {show3DBuildings && (
                            <BoundaryMesh
                                boundary={boundary}
                                isSelected={isSelected}
                                panels={bPanels}
                            />
                        )}
                        {bExclusions.map(exc => (
                            <ExclusionMesh
                                key={exc.id}
                                zone={exc}
                                boundaryHeight={boundary.height || 3}
                            />
                        ))}
                    </group>
                );
            })}

            {/* Click ground to deselect */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}
                onClick={() => selectBoundary(null)}>
                <planeGeometry args={[500, 500]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>

            <OrbitControls
                enableDamping
                dampingFactor={0.08}
                minDistance={5}
                maxDistance={300}
                maxPolarAngle={Math.PI / 2.1}
                target={[0, 3, 0]}
            />
        </>
    );
};

//                                                                               
// MAIN 3D SCENE
//                                                                               
const Survey3DScene = () => (
    <Canvas
        shadows
        camera={{ position: [30, 50, 50], fov: 50, near: 0.1, far: 2000 }}
        style={{ width: '100%', height: '100%', background: '#0a1520' }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
        dpr={[1, 2]}
    >
        <SceneContent />
    </Canvas>
);

export default Survey3DScene;

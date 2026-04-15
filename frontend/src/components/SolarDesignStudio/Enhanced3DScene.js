// Enhanced3DScene.js   Advanced 3D visualization with photorealistic building details
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
    OrbitControls,
    Sky,
    Grid,
    Html,
    Environment,
    PerspectiveCamera,
    Text,
    Line,
    Sphere,
    Box,
    useTexture,
    Cylinder,
    Cone
} from '@react-three/drei';
import * as THREE from 'three';
import { useSolarSurveyStore } from './useSolarSurveyStore';

// Enhanced Sun Light with realistic shadows
const EnhancedSunLight = () => {
    const lightRef = useRef();
    const { sunHour, sunMonth, sunSimulation } = useSolarSurveyStore();

    useFrame(() => {
        if (!lightRef.current) return;
        const hourAngle = ((sunHour - 12) / 12) * Math.PI;
        const declination = (sunMonth - 6) / 6;
        const x = Math.sin(hourAngle) * 100;
        const y = Math.max(10, Math.cos(hourAngle) * 80 + declination * 25);
        const z = Math.cos(hourAngle) * 50;
        lightRef.current.position.set(x, y, z);
        lightRef.current.target.position.set(0, 0, 0);
        lightRef.current.target.updateMatrixWorld();
    });

    return (
        <>
            <directionalLight
                ref={lightRef}
                intensity={sunSimulation.enabled ? 2.5 : 1.8}
                castShadow
                shadow-mapSize={[4096, 4096]}
                shadow-camera-near={0.1}
                shadow-camera-far={500}
                shadow-camera-left={-150}
                shadow-camera-right={150}
                shadow-camera-top={150}
                shadow-camera-bottom={-150}
                shadow-bias={-0.0001}
            />
            <ambientLight intensity={0.25} />
            <hemisphereLight args={['#87CEEB', '#3a4a2a', 0.3]} />
        </>
    );
};

// Realistic Rooftop Equipment Component
const RooftopEquipment = ({ position, type = 'hvac' }) => {
    const equipmentTypes = {
        hvac: {
            geometry: [2.0, 0.8, 1.2],
            color: '#666666',
            material: { metalness: 0.7, roughness: 0.4 }
        },
        chimney: {
            geometry: [0.8, 2.0, 0.8],
            color: '#8b4513',
            material: { metalness: 0.1, roughness: 0.8 }
        },
        vent: {
            geometry: [0.5, 0.3, 0.5],
            color: '#444444',
            material: { metalness: 0.9, roughness: 0.2 }
        },
        antenna: {
            geometry: [0.1, 3.0, 0.1],
            color: '#333333',
            material: { metalness: 0.8, roughness: 0.3 }
        }
    };

    const config = equipmentTypes[type] || equipmentTypes.hvac;

    return (
        <group position={position}>
            <mesh castShadow receiveShadow>
                <boxGeometry args={config.geometry} />
                <meshStandardMaterial
                    color={config.color}
                    {...config.material}
                />
            </mesh>

            {/* Add piping/details for HVAC units */}
            {type === 'hvac' && (
                <>
                    <mesh position={[0.6, 0.5, 0]} castShadow>
                        <cylinderGeometry args={[0.1, 0.1, 0.8]} />
                        <meshStandardMaterial color="#888888" metalness={0.9} roughness={0.2} />
                    </mesh>
                    <mesh position={[-0.6, 0.5, 0]} castShadow>
                        <cylinderGeometry args={[0.1, 0.1, 0.8]} />
                        <meshStandardMaterial color="#888888" metalness={0.9} roughness={0.2} />
                    </mesh>
                </>
            )}

            {/* Add cap for chimney */}
            {type === 'chimney' && (
                <mesh position={[0, 1.2, 0]} castShadow>
                    <cylinderGeometry args={[0.5, 0.4, 0.2]} />
                    <meshStandardMaterial color="#666666" metalness={0.3} roughness={0.6} />
                </mesh>
            )}
        </group>
    );
};

// Enhanced Tree Component for realistic environment
const RealisticTree = ({ position, scale = 1 }) => {
    const trunkHeight = 3 * scale;
    const crownRadius = 2 * scale;

    return (
        <group position={position}>
            {/* Tree trunk */}
            <mesh position={[0, trunkHeight / 2, 0]} castShadow>
                <cylinderGeometry args={[0.2 * scale, 0.3 * scale, trunkHeight]} />
                <meshStandardMaterial color="#4a3429" roughness={0.8} />
            </mesh>

            {/* Tree crown - multiple spheres for natural look */}
            <group position={[0, trunkHeight, 0]}>
                <mesh castShadow>
                    <sphereGeometry args={[crownRadius, 8, 8]} />
                    <meshStandardMaterial color="#2d5016" roughness={0.9} />
                </mesh>
                <mesh position={[0.5 * scale, 0.3 * scale, 0.3 * scale]} castShadow>
                    <sphereGeometry args={[crownRadius * 0.7, 6, 6]} />
                    <meshStandardMaterial color="#345a1a" roughness={0.9} />
                </mesh>
                <mesh position={[-0.3 * scale, 0.2 * scale, -0.4 * scale]} castShadow>
                    <sphereGeometry args={[crownRadius * 0.6, 6, 6]} />
                    <meshStandardMaterial color="#2a4d14" roughness={0.9} />
                </mesh>
            </group>
        </group>
    );
};

// Enhanced Solar Panel with photorealistic details
const PhotorealisticPanel = ({ panel, baseY, tiltRad, isExcluded = false, isSelected = false }) => {
    const meshRef = useRef();
    const { moduleWidth, moduleHeight } = useSolarSurveyStore();

    const panelWidth = moduleWidth || 2.0;
    const panelHeight = moduleHeight || 1.0;

    // Animation for panel selection
    useFrame(() => {
        if (meshRef.current) {
            const targetY = baseY + (isSelected ? 0.2 : 0.05);
            meshRef.current.position.y += (targetY - meshRef.current.position.y) * 0.1;
        }
    });

    const frameColor = isExcluded ? '#ff4444' : '#2a2a2a';
    const cellColor = isExcluded ? '#ff6666' : '#0d1b2a';

    return (
        <group
            ref={meshRef}
            position={[panel.x, baseY + 0.05, panel.z]}
            rotation={[tiltRad, panel.rotation || 0, 0]}
        >
            {/* Panel Frame - Aluminum */}
            <mesh castShadow receiveShadow>
                <boxGeometry args={[panelWidth, 0.08, panelHeight]} />
                <meshStandardMaterial
                    color={frameColor}
                    metalness={0.9}
                    roughness={0.2}
                />
            </mesh>

            {/* Tempered Glass Surface */}
            <mesh position={[0, 0.045, 0]} castShadow receiveShadow>
                <boxGeometry args={[panelWidth - 0.04, 0.004, panelHeight - 0.04]} />
                <meshPhysicalMaterial
                    color="#001122"
                    metalness={0.0}
                    roughness={0.01}
                    envMapIntensity={3.0}
                    transparent={true}
                    opacity={0.95}
                    transmission={0.1}
                    thickness={0.01}
                />
            </mesh>

            {/* Photovoltaic Cells Grid (6x10 typical) */}
            {Array.from({ length: 6 }, (_, i) =>
                Array.from({ length: 10 }, (_, j) => {
                    const cellSize = 0.15;
                    const spacing = 0.005;
                    const x = (i - 2.5) * (cellSize + spacing);
                    const z = (j - 4.5) * (cellSize + spacing);

                    return (
                        <mesh key={`${i}-${j}`} position={[x, 0.042, z]} castShadow>
                            <boxGeometry args={[cellSize, 0.002, cellSize]} />
                            <meshStandardMaterial
                                color={cellColor}
                                metalness={0.7}
                                roughness={0.3}
                            />
                        </mesh>
                    );
                })
            )}

            {/* Bus bars and interconnects */}
            <mesh position={[0, 0.043, 0]}>
                <boxGeometry args={[0.008, 0.001, panelHeight - 0.1]} />
                <meshStandardMaterial color="#c0c0c0" metalness={0.95} roughness={0.05} />
            </mesh>

            {/* Junction box */}
            <mesh position={[0, 0.05, -panelHeight / 2 + 0.1]} castShadow>
                <boxGeometry args={[0.15, 0.04, 0.08]} />
                <meshStandardMaterial color="#333333" roughness={0.8} />
            </mesh>

            {/* Selection Highlight */}
            {isSelected && (
                <mesh position={[0, 0.01, 0]}>
                    <boxGeometry args={[panelWidth + 0.1, 0.02, panelHeight + 0.1]} />
                    <meshBasicMaterial
                        color="#00ff88"
                        transparent={true}
                        opacity={0.4}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            )}

            {/* Power rating label */}
            {isSelected && (
                <Html position={[0, 0.3, 0]} center>
                    <div style={{
                        background: 'rgba(0,0,0,0.8)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        whiteSpace: 'nowrap'
                    }}>
                        {panel.capacity || 400}W - {panel.efficiency || 20}%
                    </div>
                </Html>
            )}
        </group>
    );
};

// Enhanced Building with multiple levels and realistic architecture
const ArchitecturalBuilding = ({ area, isSelected, onClick }) => {
    const { panels, exclusionZones } = useSolarSurveyStore();
    const buildingRef = useRef();

    const localPoints = area.localBoundary || [];
    if (localPoints.length < 3) return null;

    // Create building geometry from boundary
    const shape = new THREE.Shape();
    shape.moveTo(localPoints[0].x, localPoints[0].y);
    localPoints.slice(1).forEach(point => {
        shape.lineTo(point.x, point.y);
    });

    const baseHeight = area.height || 3.0;
    const rooftopHeight = 0.3;

    // Calculate center for equipment placement
    const center = localPoints.reduce(
        (acc, point) => ({
            x: acc.x + point.x / localPoints.length,
            y: acc.y + point.y / localPoints.length
        }),
        { x: 0, y: 0 }
    );

    // Generate rooftop equipment positions (avoiding panel areas)
    const equipmentPositions = [
        { pos: [center.x + 3, baseHeight + 1, center.y + 2], type: 'hvac' },
        { pos: [center.x - 4, baseHeight + 2, center.y - 3], type: 'chimney' },
        { pos: [center.x + 2, baseHeight + 0.5, center.y - 4], type: 'vent' },
        { pos: [center.x - 2, baseHeight + 3.5, center.y + 1], type: 'antenna' }
    ];

    return (
        <group ref={buildingRef} onClick={onClick}>
            {/* Main Building Structure */}
            <mesh position={[0, baseHeight / 2, 0]} receiveShadow castShadow>
                <extrudeGeometry
                    args={[shape, {
                        depth: baseHeight,
                        bevelEnabled: false
                    }]}
                />
                <meshStandardMaterial
                    color="#e8e8e8"
                    roughness={0.8}
                    metalness={0.1}
                />
            </mesh>

            {/* Rooftop Surface */}
            <mesh position={[0, baseHeight + 0.02, 0]} receiveShadow>
                <shapeGeometry args={[shape]} />
                <meshStandardMaterial
                    color="#b8b8b8"
                    roughness={0.9}
                    metalness={0.1}
                />
            </mesh>

            {/* Rooftop Equipment */}
            {equipmentPositions.map((equipment, index) => (
                <RooftopEquipment
                    key={index}
                    position={equipment.pos}
                    type={equipment.type}
                />
            ))}

            {/* Building Edge Details */}
            <mesh position={[0, baseHeight + 0.1, 0]}>
                <extrudeGeometry
                    args={[shape, {
                        depth: 0.2,
                        bevelEnabled: true,
                        bevelThickness: 0.05,
                        bevelSize: 0.05,
                        bevelSegments: 2
                    }]}
                />
                <meshStandardMaterial
                    color="#cccccc"
                    roughness={0.6}
                    metalness={0.2}
                />
            </mesh>

            {/* Selection Highlight */}
            {isSelected && (
                <mesh position={[0, baseHeight + 0.05, 0]}>
                    <shapeGeometry args={[shape]} />
                    <meshBasicMaterial
                        color="#44ff44"
                        transparent={true}
                        opacity={0.3}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            )}
        </group>
    );
};

// Exclusion Zone Visualization
const ExclusionZoneMesh = ({ zone, baseY }) => {
    const points = zone.localBoundary || [];
    if (points.length < 3) return null;

    const shape = new THREE.Shape();
    shape.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach(point => {
        shape.lineTo(point.x, point.y);
    });

    return (
        <mesh position={[0, baseY + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <shapeGeometry args={[shape]} />
            <meshBasicMaterial
                color="#ff4444"
                transparent={true}
                opacity={0.3}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
};

// Measurement Display Component
const MeasurementDisplay = ({ start, end, value, unit = "m" }) => {
    const midPoint = [
        (start[0] + end[0]) / 2,
        Math.max(start[1], end[1]) + 0.5,
        (start[2] + end[2]) / 2
    ];

    return (
        <group>
            {/* Measurement Line */}
            <Line
                points={[start, end]}
                color="#fbbf24"
                lineWidth={2}
                dashed={true}
                dashSize={0.1}
                gapSize={0.05}
            />

            {/* Start Point */}
            <Sphere args={[0.05]} position={start}>
                <meshBasicMaterial color="#fbbf24" />
            </Sphere>

            {/* End Point */}
            <Sphere args={[0.05]} position={end}>
                <meshBasicMaterial color="#fbbf24" />
            </Sphere>

            {/* Text Label */}
            <Text
                position={midPoint}
                fontSize={0.3}
                color="#fbbf24"
                anchorX="center"
                anchorY="middle"
                fillOpacity={0.9}
                strokeWidth={0.02}
                strokeColor="#000000"
                strokeOpacity={0.5}
            >
                {`${value.toFixed(2)} ${unit}`}
            </Text>
        </group>
    );
};

// Camera Controller for smooth transitions
const CameraController = () => {
    const { camera } = useThree();
    const { viewMode, cameraTransition } = useSolarSurveyStore();
    const controlsRef = useRef();

    useEffect(() => {
        if (!controlsRef.current) return;

        const controls = controlsRef.current;
        const targetPosition = new THREE.Vector3();
        const targetLookAt = new THREE.Vector3();

        switch (viewMode) {
            case '2D':
                targetPosition.set(0, 50, 0);
                targetLookAt.set(0, 0, 0);
                controls.enableRotate = false;
                break;
            case '3D':
                targetPosition.set(25, 15, 25);
                targetLookAt.set(0, 0, 0);
                controls.enableRotate = true;
                break;
            case 'OVERVIEW':
                targetPosition.set(50, 40, 50);
                targetLookAt.set(0, 0, 0);
                controls.enableRotate = true;
                break;
            default:
                return;
        }

        // Smooth camera transition
        const startPosition = camera.position.clone();
        const startLookAt = controls.target.clone();
        let progress = 0;

        const animate = () => {
            progress += 0.02;
            if (progress >= 1) {
                camera.position.copy(targetPosition);
                controls.target.copy(targetLookAt);
                controls.update();
                return;
            }

            camera.position.lerpVectors(startPosition, targetPosition, progress);
            controls.target.lerpVectors(startLookAt, targetLookAt, progress);
            controls.update();
            requestAnimationFrame(animate);
        };

        animate();
    }, [viewMode, camera]);

    return (
        <OrbitControls
            ref={controlsRef}
            enableDamping={true}
            dampingFactor={0.05}
            screenSpacePanning={false}
            minDistance={5}
            maxDistance={200}
            maxPolarAngle={Math.PI / 2.1}
        />
    );
};

// Main Enhanced 3D Scene Component
const Enhanced3DScene = () => {
    const {
        areas,
        selectedAreaId,
        measurements,
        showMeasurements,
        setSelectedArea
    } = useSolarSurveyStore();

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <Canvas
                shadows
                camera={{ position: [25, 15, 25], fov: 60 }}
                gl={{
                    antialias: true,
                    shadowMap: { enabled: true, type: THREE.PCFSoftShadowMap }
                }}
            >
                {/* Enhanced Lighting */}
                <EnhancedSunLight />

                {/* Environment */}
                <Environment preset="city" />
                <fog attach="fog" args={['#f0f8ff', 50, 300]} />

                {/* Sky */}
                <Sky
                    distance={450000}
                    sunPosition={[100, 50, 100]}
                    inclination={0}
                    azimuth={0.25}
                />

                {/* Grid */}
                <Grid
                    args={[100, 100]}
                    cellSize={1}
                    cellThickness={0.5}
                    cellColor="#94a3b8"
                    sectionSize={10}
                    sectionThickness={1}
                    sectionColor="#64748b"
                    fadeDistance={100}
                    fadeStrength={0.5}
                    followCamera={false}
                    infiniteGrid={true}
                />

                {/* Buildings/Areas */}
                {areas.map(area => (
                    <ArchitecturalBuilding
                        key={area.id}
                        area={area}
                        isSelected={area.id === selectedAreaId}
                        onClick={() => setSelectedArea(area.id)}
                    />
                ))}

                {/* Environmental Context - Trees around buildings */}
                {areas.length > 0 && (
                    <>
                        <RealisticTree position={[-15, 0, 10]} scale={1.2} />
                        <RealisticTree position={[20, 0, -12]} scale={0.8} />
                        <RealisticTree position={[-8, 0, -18]} scale={1.0} />
                        <RealisticTree position={[25, 0, 15]} scale={1.1} />
                        <RealisticTree position={[-20, 0, -8]} scale={0.9} />
                        <RealisticTree position={[12, 0, 22]} scale={1.3} />
                    </>
                )}

                {/* Solar Panels with enhanced rendering */}
                {areas.map(area =>
                    area.panels?.map(panel => (
                        <PhotorealisticPanel
                            key={panel.id}
                            panel={panel}
                            baseY={area.height || 3.0}
                            tiltRad={panel.tilt * Math.PI / 180}
                            isExcluded={panel.isExcluded}
                            isSelected={panel.isSelected}
                        />
                    ))
                )}

                {/* Surrounding Buildings (for context like in the image) */}
                {areas.length > 0 && (
                    <>
                        {/* Distant buildings for context */}
                        <mesh position={[-40, 4, -30]} castShadow>
                            <boxGeometry args={[12, 8, 15]} />
                            <meshStandardMaterial color="#d0d0d0" roughness={0.8} />
                        </mesh>
                        <mesh position={[35, 6, -25]} castShadow>
                            <boxGeometry args={[10, 12, 18]} />
                            <meshStandardMaterial color="#c8c8c8" roughness={0.8} />
                        </mesh>
                        <mesh position={[-30, 3, 40]} castShadow>
                            <boxGeometry args={[15, 6, 12]} />
                            <meshStandardMaterial color="#e0e0e0" roughness={0.8} />
                        </mesh>
                        <mesh position={[40, 5, 35]} castShadow>
                            <boxGeometry args={[8, 10, 20]} />
                            <meshStandardMaterial color="#cccccc" roughness={0.8} />
                        </mesh>
                    </>
                )}

                {/* Measurements */}
                {showMeasurements && measurements.map(measurement => (
                    <MeasurementDisplay
                        key={measurement.id}
                        start={measurement.start}
                        end={measurement.end}
                        value={measurement.distance}
                        unit={measurement.unit}
                    />
                ))}

                {/* Camera Controller */}
                <CameraController />

                {/* Enhanced Ground with multiple surfaces */}
                <group>
                    {/* Main grass area */}
                    <mesh
                        rotation={[-Math.PI / 2, 0, 0]}
                        position={[0, -0.1, 0]}
                        receiveShadow
                    >
                        <planeGeometry args={[200, 200]} />
                        <meshLambertMaterial color="#7fb069" />
                    </mesh>

                    {/* Concrete pathways */}
                    <mesh
                        rotation={[-Math.PI / 2, 0, 0]}
                        position={[0, -0.09, 0]}
                        receiveShadow
                    >
                        <planeGeometry args={[4, 100]} />
                        <meshLambertMaterial color="#a8a8a8" />
                    </mesh>
                    <mesh
                        rotation={[-Math.PI / 2, 0, 0]}
                        position={[0, -0.09, 0]}
                    >
                        <planeGeometry args={[100, 4]} />
                        <meshLambertMaterial color="#a8a8a8" />
                    </mesh>

                    {/* Parking areas */}
                    <mesh
                        rotation={[-Math.PI / 2, 0, 0]}
                        position={[30, -0.08, 20]}
                        receiveShadow
                    >
                        <planeGeometry args={[20, 15]} />
                        <meshLambertMaterial color="#404040" />
                    </mesh>
                    <mesh
                        rotation={[-Math.PI / 2, 0, 0]}
                        position={[-25, -0.08, -30]}
                        receiveShadow
                    >
                        <planeGeometry args={[18, 12]} />
                        <meshLambertMaterial color="#404040" />
                    </mesh>
                </group>
            </Canvas>

            {/* Empty State */}
            {areas.length === 0 && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none',
                    zIndex: 5,
                }}>
                    <div style={{
                        background: 'rgba(2,6,23,0.92)',
                        border: '1px solid rgba(59,130,246,0.15)',
                        borderRadius: 16,
                        padding: '28px 36px',
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>   </div>
                        <p style={{
                            color: '#f1f5f9',
                            fontWeight: 700,
                            fontSize: 15,
                            marginBottom: 6
                        }}>
                            Start Your Solar Survey
                        </p>
                        <p style={{
                            color: '#64748b',
                            fontSize: 12,
                            lineHeight: 1.6,
                            maxWidth: 320
                        }}>
                            Switch to <strong style={{ color: '#3b82f6' }}>2D Map View</strong> and use the{' '}
                            <strong style={{ color: '#3b82f6' }}>Draw Area</strong> tool to outline
                            installation areas on the satellite map.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Enhanced3DScene;

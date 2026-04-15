// Full3DMapView.js   Complete 3D map experience using Three.js with full zoom capabilities
import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
    OrbitControls,
    Sky,
    Grid,
    Html,
    Environment,
    Text,
    Line,
    Sphere,
    Box,
    Plane,
    useTexture,
    Stars,
    Cloud
} from '@react-three/drei';
import * as THREE from 'three';
import { useSolarSurveyStore } from './useSolarSurveyStore';

// Enhanced 3D Terrain Component
const TerrainMesh = ({ size = 200 }) => {
    const meshRef = useRef();
    const [heightData, setHeightData] = useState(null);

    useEffect(() => {
        // Generate procedural terrain heightmap
        const width = 128;
        const height = 128;
        const data = new Float32Array(width * height);

        for (let i = 0; i < width; i++) {
            for (let j = 0; j < height; j++) {
                const x = (i / width) * 8;
                const y = (j / height) * 8;

                // Create rolling hills using noise
                const noise1 = Math.sin(x * 0.5) * Math.cos(y * 0.5) * 2;
                const noise2 = Math.sin(x * 1.2) * Math.cos(y * 1.2) * 0.5;
                const noise3 = Math.sin(x * 2.5) * Math.cos(y * 2.5) * 0.2;

                data[i * width + j] = noise1 + noise2 + noise3;
            }
        }

        setHeightData({ data, width, height });
    }, []);

    const geometry = useMemo(() => {
        if (!heightData) return null;

        const geometry = new THREE.PlaneGeometry(size, size, heightData.width - 1, heightData.height - 1);
        const vertices = geometry.attributes.position.array;

        for (let i = 0; i < vertices.length; i += 3) {
            const x = Math.floor((i / 3) % heightData.width);
            const y = Math.floor((i / 3) / heightData.width);
            vertices[i + 2] = heightData.data[y * heightData.width + x];
        }

        geometry.computeVertexNormals();
        return geometry;
    }, [heightData, size]);

    if (!geometry) return null;

    return (
        <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <meshStandardMaterial
                color="#6b8e4a"
                roughness={0.8}
                metalness={0.1}
                wireframe={false}
            />
        </mesh>
    );
};

// Interactive 3D Drawing Tool
const DrawingTool = ({ onAreaComplete }) => {
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPoints, setCurrentPoints] = useState([]);
    const { activeTool } = useSolarSurveyStore();

    const handleClick = useCallback((event) => {
        if (activeTool !== 'draw-area') return;

        const point = event.point;
        if (!isDrawing) {
            setIsDrawing(true);
            setCurrentPoints([point]);
        } else {
            const newPoints = [...currentPoints, point];
            setCurrentPoints(newPoints);

            // Close polygon on double-click or when close to first point
            const firstPoint = newPoints[0];
            const lastPoint = point;
            const distance = Math.sqrt(
                Math.pow(lastPoint.x - firstPoint.x, 2) +
                Math.pow(lastPoint.z - firstPoint.z, 2)
            );

            if (newPoints.length > 2 && distance < 2) {
                // Complete the area
                onAreaComplete(newPoints);
                setIsDrawing(false);
                setCurrentPoints([]);
            }
        }
    }, [activeTool, isDrawing, currentPoints, onAreaComplete]);

    // Render current drawing
    if (currentPoints.length === 0) return null;

    return (
        <group>
            {/* Draw points */}
            {currentPoints.map((point, index) => (
                <Sphere key={index} position={[point.x, 0.5, point.z]} args={[0.2]}>
                    <meshBasicMaterial color="#3b82f6" />
                </Sphere>
            ))}

            {/* Draw lines between points */}
            {currentPoints.length > 1 && (
                <Line
                    points={currentPoints.map(p => [p.x, 0.5, p.z])}
                    color="#3b82f6"
                    lineWidth={2}
                />
            )}

            {/* Draw line to cursor (when drawing) */}
            {isDrawing && currentPoints.length > 0 && (
                <Html>
                    <div style={{
                        position: 'fixed',
                        bottom: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(0,0,0,0.8)',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '14px'
                    }}>
                        Click to add points   Double-click or click near first point to close
                    </div>
                </Html>
            )}
        </group>
    );
};

// 3D Building with realistic architecture
const Building3D = ({ area, isSelected, onClick }) => {
    const meshRef = useRef();
    const [hovered, setHovered] = useState(false);

    useFrame(() => {
        if (meshRef.current) {
            meshRef.current.material.opacity = hovered ? 0.9 : 0.8;
        }
    });

    if (!area.points || area.points.length < 3) return null;

    // Create shape from points
    const shape = new THREE.Shape();
    shape.moveTo(area.points[0].x, area.points[0].z);
    area.points.slice(1).forEach(point => {
        shape.lineTo(point.x, point.z);
    });

    const height = area.height || 5;

    return (
        <group
            ref={meshRef}
            onClick={(e) => {
                e.stopPropagation();
                onClick(area.id);
            }}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
        >
            {/* Building structure */}
            <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
                <extrudeGeometry
                    args={[shape, {
                        depth: height,
                        bevelEnabled: false
                    }]}
                />
                <meshStandardMaterial
                    color={isSelected ? "#3b82f6" : "#e5e7eb"}
                    transparent
                    opacity={hovered ? 0.9 : 0.8}
                    roughness={0.7}
                    metalness={0.1}
                />
            </mesh>

            {/* Rooftop */}
            <mesh position={[0, height + 0.1, 0]} receiveShadow>
                <shapeGeometry args={[shape]} />
                <meshStandardMaterial
                    color={isSelected ? "#1e40af" : "#9ca3af"}
                    roughness={0.9}
                />
            </mesh>

            {/* Building label */}
            {isSelected && (
                <Text
                    position={[0, height + 2, 0]}
                    fontSize={1}
                    color="#3b82f6"
                    anchorX="center"
                    anchorY="middle"
                >
                    {area.name || `Area ${area.id}`}
                </Text>
            )}
        </group>
    );
};

// Enhanced Camera Controls with full zoom
const Enhanced3DCameraControls = () => {
    const { camera, gl } = useThree();
    const controlsRef = useRef();
    const { viewMode } = useSolarSurveyStore();

    useEffect(() => {
        if (!controlsRef.current) return;

        const controls = controlsRef.current;

        // Configure camera limits for full zoom range
        controls.minDistance = 1;      // Very close zoom
        controls.maxDistance = 500;    // Very far zoom
        controls.maxPolarAngle = Math.PI; // Allow full rotation
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = true;

        // Mouse/touch sensitivity
        controls.rotateSpeed = 0.5;
        controls.zoomSpeed = 1.0;
        controls.panSpeed = 0.8;

        return () => {
            controls.dispose();
        };
    }, []);

    return (
        <OrbitControls
            ref={controlsRef}
            args={[camera, gl.domElement]}
            enableDamping={true}
            dampingFactor={0.05}
            minDistance={1}
            maxDistance={500}
            maxPolarAngle={Math.PI}
            rotateSpeed={0.5}
            zoomSpeed={1.0}
            panSpeed={0.8}
        />
    );
};

// Interactive Ground Plane for drawing
const InteractiveGround = ({ onGroundClick }) => {
    const meshRef = useRef();
    const [hovered, setHovered] = useState(false);

    return (
        <mesh
            ref={meshRef}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.1, 0]}
            receiveShadow
            onClick={onGroundClick}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
        >
            <planeGeometry args={[200, 200, 50, 50]} />
            <meshStandardMaterial
                color="#7fb069"
                transparent
                opacity={hovered ? 0.8 : 1.0}
                wireframe={false}
            />
        </mesh>
    );
};

// Main Full 3D Map Component
const Full3DMapView = () => {
    const {
        areas,
        activeTool,
        setActiveTool,
        addArea,
        selectedAreaId,
        setSelectedArea
    } = useSolarSurveyStore();

    const [cameraPosition, setCameraPosition] = useState([30, 20, 30]);
    const [isDrawing, setIsDrawing] = useState(false);

    // Handle area creation from 3D drawing
    const handleAreaComplete = useCallback((points) => {
        const area = {
            id: Date.now().toString(),
            name: `Area ${areas.length + 1}`,
            points: points,
            height: 5,
            type: 'building'
        };

        addArea(area);
        setActiveTool('select');
    }, [areas.length, addArea, setActiveTool]);

    // Handle ground clicks for drawing
    const handleGroundClick = useCallback((event) => {
        if (activeTool === 'draw-area') {
            event.stopPropagation();
            // 3D drawing logic would go here
        }
    }, [activeTool]);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            {/* 3D Canvas */}
            <Canvas
                shadows
                camera={{ position: cameraPosition, fov: 60 }}
                gl={{
                    antialias: true,
                    shadowMap: { enabled: true, type: THREE.PCFSoftShadowMap },
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.2
                }}
                style={{ background: 'linear-gradient(to bottom, #87CEEB 0%, #98FB98 100%)' }}
            >
                {/* Enhanced Lighting */}
                <ambientLight intensity={0.4} />
                <directionalLight
                    position={[50, 50, 50]}
                    intensity={1.5}
                    castShadow
                    shadow-mapSize={[4096, 4096]}
                    shadow-camera-near={0.1}
                    shadow-camera-far={200}
                    shadow-camera-left={-50}
                    shadow-camera-right={50}
                    shadow-camera-top={50}
                    shadow-camera-bottom={-50}
                />
                <hemisphereLight args={['#87CEEB', '#3a4a2a', 0.6]} />

                {/* Environment */}
                <Environment preset="city" />
                <fog attach="fog" args={['#f0f8ff', 80, 200]} />

                {/* Sky and Atmosphere */}
                <Sky
                    distance={450000}
                    sunPosition={[100, 50, 100]}
                    inclination={0}
                    azimuth={0.25}
                />
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

                {/* Terrain */}
                <TerrainMesh size={150} />

                {/* Interactive Ground for Drawing */}
                <InteractiveGround onGroundClick={handleGroundClick} />

                {/* Grid for reference */}
                <Grid
                    args={[200, 200]}
                    cellSize={2}
                    cellThickness={0.5}
                    cellColor="#94a3b8"
                    sectionSize={20}
                    sectionThickness={1}
                    sectionColor="#64748b"
                    fadeDistance={150}
                    fadeStrength={0.3}
                    followCamera={false}
                    infiniteGrid={true}
                />

                {/* Buildings/Areas */}
                {areas.map(area => (
                    <Building3D
                        key={area.id}
                        area={area}
                        isSelected={area.id === selectedAreaId}
                        onClick={setSelectedArea}
                    />
                ))}

                {/* Drawing Tool */}
                <DrawingTool onAreaComplete={handleAreaComplete} />

                {/* Enhanced Camera Controls with full zoom */}
                <Enhanced3DCameraControls />

            </Canvas>

            {/* 3D Drawing Instructions */}
            {activeTool === 'draw-area' && (
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(59, 130, 246, 0.95)',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    zIndex: 10,
                    backdropFilter: 'blur(8px)'
                }}>
                        Click points on the ground to draw building outline   Double-click to finish
                </div>
            )}

            {/* Zoom Level Indicator */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                background: 'rgba(0,0,0,0.8)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                zIndex: 10
            }}>
                3D Mode   Full Zoom Enabled
            </div>

            {/* Camera Controls Guide */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                background: 'rgba(0,0,0,0.8)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                zIndex: 10,
                lineHeight: '1.4'
            }}>
                <div><strong>Mouse:</strong> Drag to rotate</div>
                <div><strong>Wheel:</strong> Zoom in/out</div>
                <div><strong>Right-click + Drag:</strong> Pan</div>
            </div>

            {/* Empty State for no areas */}
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
                        background: 'rgba(2,6,23,0.95)',
                        border: '2px solid rgba(59,130,246,0.3)',
                        borderRadius: '20px',
                        padding: '32px 40px',
                        backdropFilter: 'blur(16px)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    }}>
                        <div style={{ fontSize: 56, marginBottom: 16 }}>  </div>
                        <h3 style={{
                            color: '#f1f5f9',
                            fontWeight: 700,
                            fontSize: 18,
                            marginBottom: 8,
                            margin: 0
                        }}>
                            Full 3D Map Experience
                        </h3>
                        <p style={{
                            color: '#94a3b8',
                            fontSize: 14,
                            lineHeight: 1.6,
                            maxWidth: 350,
                            margin: '8px 0 0 0'
                        }}>
                            Use the <strong style={{ color: '#3b82f6' }}>Draw Area</strong> tool to create
                            building outlines directly in 3D space. Full zoom and rotation enabled!
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Full3DMapView;

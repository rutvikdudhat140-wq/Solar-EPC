// Scene3D.js   Three.js / R3F 3D Viewport
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sky, Grid, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useSolarStore } from './useSolarStore';

/*    Sun light that tracks hour/month                                         */
const SunLight = () => {
    const lightRef = useRef();
    const { sunHour, sunMonth } = useSolarStore();

    useFrame(() => {
        if (!lightRef.current) return;
        const hourAngle = ((sunHour - 12) / 12) * Math.PI;
        const declination = (sunMonth - 6) / 6;
        const x = Math.sin(hourAngle) * 80;
        const y = Math.max(5, Math.cos(hourAngle) * 60 + declination * 20);
        const z = Math.cos(hourAngle) * 40;
        lightRef.current.position.set(x, y, z);
    });

    return (
        <>
            <directionalLight
                ref={lightRef}
                intensity={1.8}
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-near={1}
                shadow-camera-far={300}
                shadow-camera-left={-80}
                shadow-camera-right={80}
                shadow-camera-top={80}
                shadow-camera-bottom={-80}
            />
            <ambientLight intensity={0.35} />
            <hemisphereLight args={['#87CEEB', '#5a7a4a', 0.4]} />
        </>
    );
};

/*    Single Solar Panel mesh                                                  */
const PanelMesh = ({ panel, baseY, tiltRad }) => {
    const { moduleWidth, moduleHeight } = useSolarStore();
    return (
        <group position={[panel.x, baseY + 0.05, panel.z]} rotation={[tiltRad, panel.rotation || 0, 0]}>
            {/* Frame */}
            <mesh castShadow receiveShadow>
                <boxGeometry args={[moduleWidth, 0.04, moduleHeight]} />
                <meshStandardMaterial color="#1a2a3a" metalness={0.6} roughness={0.4} />
            </mesh>
            {/* Glass cell */}
            <mesh position={[0, 0.025, 0]}>
                <boxGeometry args={[moduleWidth - 0.05, 0.005, moduleHeight - 0.05]} />
                <meshStandardMaterial color="#0d2b4e" metalness={0.9} roughness={0.05} envMapIntensity={2} />
            </mesh>
            {/* Cell grid lines */}
            {[-0.25, 0, 0.25].map((ox) =>
                [-0.5, 0, 0.5].map((oz) => (
                    <mesh key={`${ox}-${oz}`} position={[ox, 0.028, oz]}>
                        <boxGeometry args={[0.005, 0.005, moduleHeight - 0.06]} />
                        <meshStandardMaterial color="#0a1f36" />
                    </mesh>
                ))
            )}
        </group>
    );
};

/*    Roof building mesh                                                        */
const RoofMesh = ({ roof, isSelected, onClick }) => {
    const { panels, roofSettings, panelSettings } = useSolarStore();
    const roofPanels = panels.filter((p) => p.roofId === roof.id);
    const tiltRad = ((panelSettings?.tilt || 20) * Math.PI) / 180;
    const w = 20; // Default width for simple visualization
    const d = 12; // Default depth for simple visualization
    const h = roof.height || roofSettings?.height || 3;

    return (
        <group position={[roof.x || 0, 0, roof.z || 0]} rotation={[0, (roof.rotation || 0) * (Math.PI / 180), 0]}>
            {/* Building body */}
            <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[w, h, d]} />
                <meshStandardMaterial color={isSelected ? '#1e3a5f' : '#2a2a3a'} roughness={0.8} />
            </mesh>

            {/* Roof surface */}
            <mesh
                position={[0, h + 0.05, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                castShadow
                receiveShadow
                onClick={onClick}
            >
                <planeGeometry args={[w, d]} />
                <meshStandardMaterial
                    color={isSelected ? '#2a4a7f' : '#3a3a4a'}
                    roughness={0.6}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Selection outline */}
            {isSelected && (
                <lineSegments position={[0, h + 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <edgesGeometry args={[new THREE.PlaneGeometry(w, d)]} />
                    <lineBasicMaterial color="#3b82f6" linewidth={2} />
                </lineSegments>
            )}

            {/* Panels on this roof */}
            {roofPanels.map((p) => (
                <PanelMesh key={p.id} panel={p} baseY={h + 0.05} tiltRad={tiltRad} />
            ))}

            {/* Roof label */}
            <Html position={[0, h + 1.5, 0]} center>
                <div style={{
                    background: 'rgba(15,24,41,0.85)',
                    border: '1px solid rgba(59,130,246,0.4)',
                    borderRadius: 6,
                    padding: '2px 8px',
                    color: '#93c5fd',
                    fontSize: 11,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                }}>
                    {roof.label || roof.id}   {roofPanels.length} panels
                </div>
            </Html>
        </group>
    );
};

/*    Obstacle mesh (tree / water-tank)                                        */
const ObstacleMesh = ({ obs }) => {
    if (obs.type === 'tree') {
        return (
            <group position={[obs.x || 0, 0, obs.z || 0]}>
                <mesh position={[0, 1.5, 0]} castShadow>
                    <cylinderGeometry args={[0.2, 0.3, 3, 8]} />
                    <meshStandardMaterial color="#5a3a1a" roughness={0.9} />
                </mesh>
                <mesh position={[0, 4, 0]} castShadow>
                    <coneGeometry args={[2, 4, 8]} />
                    <meshStandardMaterial color="#2d5a1a" roughness={0.8} />
                </mesh>
            </group>
        );
    }
    // water tank / chimney
    return (
        <mesh position={[obs.x || 0, (obs.height || 2) / 2, obs.z || 0]} castShadow>
            <cylinderGeometry args={[obs.radius || 1, obs.radius || 1, obs.height || 2, 16]} />
            <meshStandardMaterial color="#607080" roughness={0.7} metalness={0.3} />
        </mesh>
    );
};

/*    Ground plane                                                             */
const Ground = () => (
    <>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
            <planeGeometry args={[300, 300]} />
            <meshStandardMaterial color="#1a2510" roughness={1} />
        </mesh>
        <Grid
            args={[200, 200]}
            position={[0, 0, 0]}
            cellSize={5}
            cellColor="#2a3a2a"
            sectionSize={25}
            sectionColor="#3a5a3a"
            fadeDistance={150}
            infiniteGrid
        />
    </>
);

/*    Main Scene                                                               */
const SceneContent = () => {
    const { roofs, obstacles, selectedRoofId, setSelectedRoof } = useSolarStore();

    const handleGroundClick = (e) => {
        e.stopPropagation();
        setSelectedRoof(null);
    };

    return (
        <>
            <Sky sunPosition={[100, 30, 100]} turbidity={4} rayleigh={0.5} />
            <SunLight />
            <Ground />
            {roofs.map((roof) => (
                <RoofMesh
                    key={roof.id}
                    roof={roof}
                    isSelected={selectedRoofId === roof.id}
                    onClick={(e) => { e.stopPropagation(); setSelectedRoof(roof.id); }}
                />
            ))}
            {obstacles.map((obs) => (
                <ObstacleMesh key={obs.id} obs={obs} />
            ))}
            {/* Invisible ground click target */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} onClick={handleGroundClick}>
                <planeGeometry args={[300, 300]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>
            <OrbitControls
                enableDamping
                dampingFactor={0.07}
                minDistance={5}
                maxDistance={250}
                maxPolarAngle={Math.PI / 2.1}
            />
        </>
    );
};

/*    Exported Canvas                                                          */
const Scene3D = () => (
    <Canvas
        shadows
        camera={{ position: [0, 40, 60], fov: 50, near: 0.1, far: 1000 }}
        style={{ width: '100%', height: '100%', background: '#0a1520' }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
    >
        <SceneContent />
    </Canvas>
);

export default Scene3D;

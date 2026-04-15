// Professional 3D Charts Component - Solar OS Dashboard
// Creative, attractive, and diverse chart types for each module
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Html, OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

//                                                                                
// 3D CYLINDER BAR - For Installation Status (vertical cylinders)
//                                                                                
function CylinderBar3D({ position, height, color, label, value, maxValue, isHovered, onHover }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const barHeight = Math.max((value / maxValue) * 3, 0.2);

  useFrame((state) => {
    if (meshRef.current && (isHovered || hovered)) {
      meshRef.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
    }
  });

  return (
    <group position={[position[0], 0, position[2]]}>
      {/* Main Cylinder */}
      <mesh
        ref={meshRef}
        position={[0, barHeight / 2, 0]}
        onPointerOver={() => { setHovered(true); onHover(label); }}
        onPointerOut={() => { setHovered(false); onHover(null); }}
      >
        <cylinderGeometry args={[0.35, 0.35, barHeight, 32]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.1} 
          metalness={0.4}
          emissive={color}
          emissiveIntensity={hovered ? 0.4 : 0.15}
        />
      </mesh>
      
      {/* Top cap glow */}
      <mesh position={[0, barHeight, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.05, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>

      {/* Value label floating above */}
      <Text
        position={[0, barHeight + 0.5, 0]}
        fontSize={0.3}
        color="#ffffff"
        anchorX="center"
        anchorY="bottom"
        font="https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-EkQ.woff"
      >
        {value}
      </Text>

      {/* Category label below */}
      <Text
        position={[0, -0.4, 0.8]}
        fontSize={0.22}
        color="#94a3b8"
        anchorX="center"
        anchorY="top"
        font="https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-EkQ.woff"
      >
        {label?.substring(0, 12)}
      </Text>
    </group>
  );
}

//                                                                                
// 3D HORIZONTAL BAR - For Service Tickets (horizontal layout)
//                                                                                
function HorizontalBar3D({ position, width, color, label, value, maxValue, isHovered, onHover }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const barWidth = Math.max((value / maxValue) * 4, 0.2);

  useFrame((state) => {
    if (meshRef.current && (isHovered || hovered)) {
      meshRef.current.position.x = barWidth / 2 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });

  return (
    <group position={[position[0], position[1], position[2]]}>
      {/* Background track */}
      <mesh position={[2, 0, -0.1]}>
        <boxGeometry args={[4, 0.4, 0.2]} />
        <meshStandardMaterial color="#1e293b" transparent opacity={0.3} />
      </mesh>

      {/* Main Bar */}
      <mesh
        ref={meshRef}
        position={[barWidth / 2, 0, 0]}
        onPointerOver={() => { setHovered(true); onHover(label); }}
        onPointerOut={() => { setHovered(false); onHover(null); }}
      >
        <boxGeometry args={[barWidth, 0.5, 0.4]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.2} 
          metalness={0.3}
          emissive={color}
          emissiveIntensity={hovered ? 0.3 : 0.1}
        />
      </mesh>

      {/* Label on left */}
      <Text
        position={[-0.5, 0, 0.3]}
        fontSize={0.25}
        color="#ffffff"
        anchorX="right"
        anchorY="center"
        font="https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-EkQ.woff"
      >
        {label?.substring(0, 15)}
      </Text>

      {/* Value at end of bar */}
      <Text
        position={[barWidth + 0.3, 0, 0]}
        fontSize={0.28}
        color={color}
        anchorX="left"
        anchorY="center"
        font="https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-EkQ.woff"
      >
        {value}
      </Text>
    </group>
  );
}

//                                                                                
// 3D FLOATING PIE SLICE - For Quotations (floating effect with different heights)
//                                                                                
function FloatingSlice3D({ startAngle, endAngle, color, label, value, total, isHovered, onHover, index }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const baseHeight = 0.3 + (index * 0.15);
  
  const midAngle = (startAngle + endAngle) / 2;
  
  const shape = useMemo(() => {
    const shape = new THREE.Shape();
    const arc = endAngle - startAngle;
    const segments = Math.max(3, Math.floor(arc * 32));
    const innerRadius = 0;
    const outerRadius = 2;
    
    shape.moveTo(0, 0);
    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + (arc * i / segments);
      shape.lineTo(outerRadius * Math.cos(angle), outerRadius * Math.sin(angle));
    }
    shape.lineTo(0, 0);
    shape.closePath();
    return shape;
  }, [startAngle, endAngle]);

  const geometry = useMemo(() => {
    return new THREE.ExtrudeGeometry(shape, {
      depth: isHovered || hovered ? baseHeight + 0.3 : baseHeight,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 2,
      bevelSize: 0.02,
      bevelThickness: 0.02,
    });
  }, [shape, baseHeight, isHovered, hovered]);

  const position = useMemo(() => {
    const explode = (isHovered || hovered) ? 0.4 : 0;
    return [
      Math.cos(midAngle) * explode,
      Math.sin(midAngle) * explode,
      (isHovered || hovered ? baseHeight + 0.3 : baseHeight) / 2
    ];
  }, [midAngle, isHovered, hovered, baseHeight]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3 + index) * 0.03;
    }
  });

  const percentage = ((value / total) * 100).toFixed(1);

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        position={position}
        rotation={[0, 0, 0]}
        onPointerOver={() => { setHovered(true); onHover(label); }}
        onPointerOut={() => { setHovered(false); onHover(null); }}
      >
        <meshStandardMaterial 
          color={color} 
          roughness={0.15} 
          metalness={0.2}
          emissive={color}
          emissiveIntensity={hovered ? 0.25 : 0}
        />
      </mesh>
      
      {(isHovered || hovered) && (
        <Html position={[Math.cos(midAngle) * 2.5, Math.sin(midAngle) * 2.5, 1]}>
          <div className="bg-[#0f1829] border border-[rgba(37,99,235,0.5)] px-4 py-2 rounded-xl shadow-2xl pointer-events-none backdrop-blur-sm">
            <p className="text-white text-sm font-bold">{label}</p>
            <p className="text-[#f59e0b] text-xs font-semibold">{value} ({percentage}%)</p>
          </div>
        </Html>
      )}
    </group>
  );
}

//                                                                                
// 3D DONUT SLICE - Enhanced for Project Pipeline
//                                                                                
function DonutSlice3D({ startAngle, endAngle, color, label, value, total, isHovered, onHover }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  
  const midAngle = (startAngle + endAngle) / 2;
  const extrudeSettings = {
    depth: 0.5,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 2,
    bevelSize: 0.03,
    bevelThickness: 0.03,
  };

  const shape = useMemo(() => {
    const shape = new THREE.Shape();
    const arc = endAngle - startAngle;
    const segments = Math.max(3, Math.floor(arc * 32));
    const innerRadius = 0.8;
    const outerRadius = 2.2;
    
    shape.moveTo(innerRadius * Math.cos(startAngle), innerRadius * Math.sin(startAngle));
    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + (arc * i / segments);
      shape.lineTo(outerRadius * Math.cos(angle), outerRadius * Math.sin(angle));
    }
    for (let i = segments; i >= 0; i--) {
      const angle = startAngle + (arc * i / segments);
      shape.lineTo(innerRadius * Math.cos(angle), innerRadius * Math.sin(angle));
    }
    shape.closePath();
    return shape;
  }, [startAngle, endAngle]);

  const geometry = useMemo(() => {
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [shape]);

  const position = useMemo(() => {
    const explode = (isHovered || hovered) ? 0.35 : 0;
    return [
      Math.cos(midAngle) * explode,
      Math.sin(midAngle) * explode,
      0.25
    ];
  }, [midAngle, isHovered, hovered]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.4) * 0.015;
    }
  });

  const percentage = ((value / total) * 100).toFixed(1);

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        position={position}
        onPointerOver={() => { setHovered(true); onHover(label); }}
        onPointerOut={() => { setHovered(false); onHover(null); }}
      >
        <meshStandardMaterial 
          color={color} 
          roughness={0.15} 
          metalness={0.15}
          emissive={color}
          emissiveIntensity={hovered ? 0.25 : 0}
        />
      </mesh>
      
      {(isHovered || hovered) && (
        <Html position={[Math.cos(midAngle) * 3.2, Math.sin(midAngle) * 3.2, 0.8]}>
          <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-[rgba(37,99,235,0.4)] px-4 py-3 rounded-xl shadow-2xl pointer-events-none backdrop-blur-md">
            <p className="text-white text-sm font-bold mb-1">{label}</p>
            <p className="text-[#f59e0b] text-xs font-semibold">{value.toLocaleString()} ({percentage}%)</p>
          </div>
        </Html>
      )}
    </group>
  );
}

//                                                                                
// 3D STACKED COLUMN - For Procurement
//                                                                                
function StackedColumn3D({ position, segments, colors, labels, values, total, isHovered, onHover }) {
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);
  const maxHeight = 3;
  
  let currentY = 0;
  const segmentMeshes = useMemo(() => {
    return values.map((value, i) => {
      const segmentHeight = Math.max((value / total) * maxHeight, 0.1);
      const result = {
        height: segmentHeight,
        color: colors[i],
        label: labels[i],
        value,
        y: currentY + segmentHeight / 2
      };
      currentY += segmentHeight;
      return result;
    });
  }, [values, total, colors, labels]);

  useFrame((state) => {
    if (groupRef.current && (isHovered || hovered)) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  return (
    <group 
      ref={groupRef}
      position={[position[0], 0, position[2]]}
      onPointerOver={() => { setHovered(true); onHover(labels.join(' | ')); }}
      onPointerOut={() => { setHovered(false); onHover(null); }}
    >
      {segmentMeshes.map((segment, i) => (
        <mesh key={i} position={[0, segment.y, 0]}>
          <cylinderGeometry args={[0.5, 0.5, segment.height, 32]} />
          <meshStandardMaterial 
            color={segment.color}
            roughness={0.1}
            metalness={0.3}
            emissive={segment.color}
            emissiveIntensity={hovered ? 0.2 : 0}
          />
        </mesh>
      ))}
      
      {/* Total label on top */}
      <Text
        position={[0, currentY + 0.5, 0]}
        fontSize={0.4}
        color="#ffffff"
        anchorX="center"
        anchorY="bottom"
        font="https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-EkQ.woff"
      >
        {total}
      </Text>
    </group>
  );
}

//                                                                                
// EXPORTED CHART COMPONENTS - Each with unique styling
//                                                                                

// 1. PROJECT PIPELINE - 3D Donut Chart (Enhanced)
export function ProjectPipeline3D({ data, height = 320 }) {
  const [hoveredLabel, setHoveredLabel] = useState(null);
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);
  
  const colors = ['#3b82f6', '#22d3ee', '#2563eb', '#f59e0b', '#22c55e', '#a855f7'];

  let currentAngle = 0;
  const slices = useMemo(() => {
    return data.map((item, i) => {
      const angle = (item.value / total) * Math.PI * 2;
      const slice = {
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        color: item.fill || colors[i % colors.length],
        label: item.name,
        value: item.value,
      };
      currentAngle += angle;
      return slice;
    });
  }, [data, total]);

  return (
    <div className="w-full h-full relative" style={{ height }}>
      <Canvas camera={{ position: [0, 0, 7], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <pointLight position={[-5, -5, -5]} intensity={0.6} color="#3b82f6" />
        
        <group rotation={[Math.PI / 8, 0, 0]}>
          {slices.map((slice, i) => (
            <DonutSlice3D
              key={i}
              startAngle={slice.startAngle}
              endAngle={slice.endAngle}
              color={slice.color}
              label={slice.label}
              value={slice.value}
              total={total}
              isHovered={hoveredLabel === slice.label}
              onHover={setHoveredLabel}
            />
          ))}
        </group>
        
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.8} />
        <Environment preset="city" />
        <ContactShadows position={[0, -2, 0]} opacity={0.3} scale={10} blur={3} far={5} />
      </Canvas>
      
      {/* Center Label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="text-3xl font-bold text-white">{total}</p>
          <p className="text-xs text-[#94a3b8]">Total</p>
        </div>
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-2 justify-center">
        {data.map((item, i) => (
          <div 
            key={i} 
            className="flex items-center gap-1.5 px-2 py-1 bg-[#0f1829]/80 backdrop-blur rounded-lg border border-[rgba(255,255,255,0.1)]"
            onMouseEnter={() => setHoveredLabel(item.name)}
            onMouseLeave={() => setHoveredLabel(null)}
          >
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill || colors[i] }} />
            <span className="text-xs text-[#94a3b8]">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 2. INSTALLATION STATUS - 3D Cylinder Columns
export function InstallationStatus3D({ data, height = 320 }) {
  const [hoveredLabel, setHoveredLabel] = useState(null);
  const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);
  
  const spacing = 1.8;
  const totalWidth = (data.length - 1) * spacing;

  return (
    <div className="w-full h-full relative" style={{ height }}>
      <Canvas camera={{ position: [0, 2, 8], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1.1} />
        <pointLight position={[-5, 5, 5]} intensity={0.5} color="#22d3ee" />
        
        <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[15, 8]} />
          <meshStandardMaterial color="#0b1220" transparent opacity={0.3} />
        </mesh>
        
        <group position={[-totalWidth / 2, 0, 0]}>
          {data.map((item, i) => (
            <CylinderBar3D
              key={i}
              position={[i * spacing, 0, 0]}
              height={item.value}
              color={item.fill}
              label={item.name}
              value={item.value}
              maxValue={maxValue}
              isHovered={hoveredLabel === item.name}
              onHover={setHoveredLabel}
            />
          ))}
        </group>
        
        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2.2} />
        <ContactShadows position={[0, -0.1, 0]} opacity={0.4} scale={15} blur={4} far={5} />
      </Canvas>
      
      {hoveredLabel && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#0f1829]/90 rounded-lg border border-[rgba(34,211,238,0.3)]">
          <p className="text-sm text-[#22d3ee] font-semibold">{hoveredLabel}</p>
        </div>
      )}
    </div>
  );
}

// 3. QUOTATION STATUS - 3D Floating Pie
export function QuotationStatus3D({ data, height = 320 }) {
  const [hoveredLabel, setHoveredLabel] = useState(null);
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);
  
  const colors = ['#22c55e', '#f59e0b', '#ef4444'];

  let currentAngle = 0;
  const slices = useMemo(() => {
    return data.map((item, i) => {
      const angle = (item.value / total) * Math.PI * 2;
      const slice = {
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        color: item.fill || colors[i % colors.length],
        label: item.name,
        value: item.value,
        index: i
      };
      currentAngle += angle;
      return slice;
    });
  }, [data, total]);

  return (
    <div className="w-full h-full relative" style={{ height }}>
      <Canvas camera={{ position: [0, 4, 8], fov: 45 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 10, 5]} intensity={1} />
        <pointLight position={[-5, 5, 5]} intensity={0.6} color="#f59e0b" />
        
        <group rotation={[Math.PI / 3, 0, 0]}>
          {slices.map((slice, i) => (
            <FloatingSlice3D
              key={i}
              startAngle={slice.startAngle}
              endAngle={slice.endAngle}
              color={slice.color}
              label={slice.label}
              value={slice.value}
              total={total}
              index={slice.index}
              isHovered={hoveredLabel === slice.label}
              onHover={setHoveredLabel}
            />
          ))}
        </group>
        
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
        <ContactShadows position={[0, -1, 0]} opacity={0.2} scale={10} blur={3} far={6} />
      </Canvas>
      
      {/* Legend */}
      <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-3 justify-center">
        {data.map((item, i) => (
          <div 
            key={i} 
            className="flex items-center gap-2 px-3 py-1.5 bg-[#0f1829]/80 backdrop-blur rounded-lg border border-[rgba(255,255,255,0.1)]"
            onMouseEnter={() => setHoveredLabel(item.name)}
            onMouseLeave={() => setHoveredLabel(null)}
          >
            <div className="w-3 h-3 rounded" style={{ backgroundColor: item.fill || colors[i] }} />
            <span className="text-sm text-[#94a3b8]">{item.name}: {item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 4. SERVICE TICKETS - 3D Horizontal Bars
export function ServiceTickets3D({ data, height = 320 }) {
  const [hoveredLabel, setHoveredLabel] = useState(null);
  const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);

  return (
    <div className="w-full h-full relative" style={{ height }}>
      <Canvas camera={{ position: [2, 1, 8], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 5, 5]} intensity={1.1} />
        
        <group>
          {data.map((item, i) => (
            <HorizontalBar3D
              key={i}
              position={[-2, 1.5 - i * 1.2, 0]}
              width={item.value}
              color={item.fill}
              label={item.name}
              value={item.value}
              maxValue={maxValue}
              isHovered={hoveredLabel === item.name}
              onHover={setHoveredLabel}
            />
          ))}
        </group>
        
        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2} />
      </Canvas>
      
      {hoveredLabel && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#0f1829]/90 rounded-lg border border-[rgba(236,72,153,0.4)]">
          <p className="text-sm text-[#ec4899] font-semibold">{hoveredLabel}</p>
        </div>
      )}
    </div>
  );
}

// 5. PROCUREMENT STATUS - 3D Stacked Columns
export function ProcurementStatus3D({ data, height = 320 }) {
  const [hoveredLabel, setHoveredLabel] = useState(null);
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);
  const colors = data.map(d => d.fill);
  const labels = data.map(d => d.name);
  const values = data.map(d => d.value);

  return (
    <div className="w-full h-full relative" style={{ height }}>
      <Canvas camera={{ position: [0, 3, 7], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} />
        <pointLight position={[-5, 5, 5]} intensity={0.6} color="#f97316" />
        
        <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color="#0b1220" transparent opacity={0.3} />
        </mesh>
        
        <group>
          <StackedColumn3D
            position={[0, 0, 0]}
            segments={data.length}
            colors={colors}
            labels={labels}
            values={values}
            total={total}
            isHovered={hoveredLabel === 'procurement'}
            onHover={setHoveredLabel}
          />
        </group>
        
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.6} />
        <ContactShadows position={[0, -0.1, 0]} opacity={0.4} scale={10} blur={3} far={5} />
      </Canvas>
      
      {/* Legend */}
      <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-2 justify-center">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-[#0f1829]/80 rounded-lg">
            <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: item.fill }} />
            <span className="text-xs text-[#94a3b8]">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 6. INVENTORY BY CATEGORY - 3D Cylinder Bars
export function InventoryCategory3D({ data, height = 320 }) {
  const [hoveredLabel, setHoveredLabel] = useState(null);
  const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);
  
  const spacing = 1.3;
  const totalWidth = (data.length - 1) * spacing;

  return (
    <div className="w-full h-full relative" style={{ height }}>
      <Canvas camera={{ position: [0, 3, 9], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1.1} />
        <pointLight position={[-5, 5, 5]} intensity={0.5} color="#a855f7" />
        
        <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[15, 8]} />
          <meshStandardMaterial color="#0b1220" transparent opacity={0.3} />
        </mesh>
        
        <group position={[-totalWidth / 2, 0, 0]}>
          {data.map((item, i) => (
            <CylinderBar3D
              key={i}
              position={[i * spacing, 0, 0]}
              height={item.value}
              color={item.fill || ['#2563eb', '#3b82f6', '#60a5fa', '#22c55e', '#f59e0b'][i]}
              label={item.name}
              value={item.value}
              maxValue={maxValue}
              isHovered={hoveredLabel === item.name}
              onHover={setHoveredLabel}
            />
          ))}
        </group>
        
        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2} />
        <ContactShadows position={[0, -0.1, 0]} opacity={0.3} scale={15} blur={3} far={4} />
      </Canvas>
      
      {hoveredLabel && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#0f1829]/90 rounded-lg border border-[rgba(168,85,247,0.3)]">
          <p className="text-sm text-[#a855f7] font-semibold">{hoveredLabel}</p>
        </div>
      )}
    </div>
  );
}

// Backward compatibility exports
export const DonutChart3D = ProjectPipeline3D;
export const BarChart3D = InventoryCategory3D;

export default { 
  ProjectPipeline3D, 
  InstallationStatus3D, 
  QuotationStatus3D, 
  ServiceTickets3D, 
  ProcurementStatus3D, 
  InventoryCategory3D,
  DonutChart3D,
  BarChart3D
};

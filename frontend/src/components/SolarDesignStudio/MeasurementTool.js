// MeasurementTool.js   Interactive measurement tool for 3D and 2D views
import React, { useRef, useState, useCallback } from 'react';
import { useSolarSurveyStore } from './useSolarSurveyStore';
import { Ruler, X, Check, RotateCcw } from 'lucide-react';

// Distance calculation utility
const calculateDistance = (point1, point2) => {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    const dz = point2.z - point1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

// Format distance with appropriate units
const formatDistance = (distance) => {
    if (distance < 1) {
        return `${Math.round(distance * 100)} cm`;
    } else if (distance < 1000) {
        return `${distance.toFixed(2)} m`;
    } else {
        return `${(distance / 1000).toFixed(2)} km`;
    }
};

// Measurement Line Component for 3D visualization
export const MeasurementLine = ({ measurement, isActive, onEdit, onDelete }) => {
    const { start, end, distance, label } = measurement;

    return (
        <group>
            {/* Main measurement line */}
            <line>
                <bufferGeometry>
                    <bufferAttribute
                        attachObject={['attributes', 'position']}
                        count={2}
                        array={new Float32Array([
                            start.x, start.y, start.z,
                            end.x, end.y, end.z
                        ])}
                        itemSize={3}
                    />
                </bufferGeometry>
                <lineBasicMaterial
                    color={isActive ? "#fbbf24" : "#94a3b8"}
                    linewidth={isActive ? 3 : 2}
                />
            </line>

            {/* Start point marker */}
            <mesh position={[start.x, start.y, start.z]}>
                <sphereGeometry args={[0.05]} />
                <meshBasicMaterial color={isActive ? "#fbbf24" : "#94a3b8"} />
            </mesh>

            {/* End point marker */}
            <mesh position={[end.x, end.y, end.z]}>
                <sphereGeometry args={[0.05]} />
                <meshBasicMaterial color={isActive ? "#fbbf24" : "#94a3b8"} />
            </mesh>

            {/* Distance label */}
            <mesh
                position={[
                    (start.x + end.x) / 2,
                    Math.max(start.y, end.y) + 0.3,
                    (start.z + end.z) / 2
                ]}
            >
                <textGeometry
                    args={[
                        label || formatDistance(distance),
                        { font: null, size: 0.2, height: 0.01 }
                    ]}
                />
                <meshBasicMaterial color={isActive ? "#fbbf24" : "#94a3b8"} />
            </mesh>
        </group>
    );
};

// Measurement Controls Panel
const MeasurementPanel = () => {
    const {
        measurements,
        measurementMode,
        showMeasurements,
        setMeasurementMode,
        setShowMeasurements,
        clearMeasurements,
        removeMeasurement
    } = useSolarSurveyStore();

    const [selectedMeasurementId, setSelectedMeasurementId] = useState(null);

    return (
        <div style={{
            position: 'absolute',
            top: 80,
            left: 16,
            background: 'rgba(2, 6, 23, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 12,
            padding: 16,
            backdropFilter: 'blur(12px)',
            minWidth: 280,
            maxWidth: 320,
            zIndex: 10,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                }}>
                    <Ruler size={16} style={{ color: '#3b82f6' }} />
                    <h3 style={{
                        fontSize: 14,
                        color: '#f1f5f9',
                        fontWeight: 700,
                        margin: 0
                    }}>
                        Measurements
                    </h3>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                    <button
                        onClick={() => setShowMeasurements(!showMeasurements)}
                        style={{
                            padding: '4px 8px',
                            background: showMeasurements ? 'rgba(34, 197, 94, 0.2)' : 'rgba(156, 163, 175, 0.2)',
                            color: showMeasurements ? '#22c55e' : '#9ca3af',
                            border: `1px solid ${showMeasurements ? 'rgba(34, 197, 94, 0.3)' : 'rgba(156, 163, 175, 0.3)'}`,
                            borderRadius: 4,
                            fontSize: 10,
                            cursor: 'pointer'
                        }}
                    >
                           
                    </button>
                    {measurements.length > 0 && (
                        <button
                            onClick={clearMeasurements}
                            style={{
                                padding: '4px 8px',
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: 4,
                                fontSize: 10,
                                cursor: 'pointer'
                            }}
                        >
                               
                        </button>
                    )}
                </div>
            </div>

            {/* Measurement Mode Toggle */}
            <button
                onClick={() => setMeasurementMode(!measurementMode)}
                style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: measurementMode ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                    color: measurementMode ? '#22c55e' : '#3b82f6',
                    border: `1px solid ${measurementMode ? 'rgba(34, 197, 94, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                }}
            >
                {measurementMode ? (
                    <>
                        <Check size={16} />
                        Active - Click to Measure
                    </>
                ) : (
                    <>
                        <Ruler size={16} />
                        Start Measuring
                    </>
                )}
            </button>

            {/* Instructions */}
            {measurementMode && (
                <div style={{
                    padding: 12,
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: 8,
                    marginBottom: 16
                }}>
                    <div style={{
                        fontSize: 11,
                        color: '#3b82f6',
                        fontWeight: 600,
                        marginBottom: 4
                    }}>
                        Measurement Mode Active
                    </div>
                    <div style={{
                        fontSize: 10,
                        color: '#64748b',
                        lineHeight: 1.4
                    }}>
                        Click two points in the 3D scene to measure distance between them.
                        Press ESC to cancel current measurement.
                    </div>
                </div>
            )}

            {/* Measurements List */}
            {measurements.length > 0 && (
                <div style={{ marginTop: 16 }}>
                    <div style={{
                        fontSize: 11,
                        color: '#64748b',
                        marginBottom: 8,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        Saved Measurements ({measurements.length})
                    </div>
                    <div style={{
                        maxHeight: 200,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8
                    }}>
                        {measurements.map((measurement, index) => (
                            <div
                                key={measurement.id}
                                style={{
                                    padding: 12,
                                    background: selectedMeasurementId === measurement.id
                                        ? 'rgba(59, 130, 246, 0.1)'
                                        : 'rgba(55, 65, 81, 0.3)',
                                    border: `1px solid ${selectedMeasurementId === measurement.id
                                        ? 'rgba(59, 130, 246, 0.3)'
                                        : 'rgba(75, 85, 99, 0.3)'}`,
                                    borderRadius: 8,
                                    cursor: 'pointer'
                                }}
                                onClick={() => setSelectedMeasurementId(
                                    selectedMeasurementId === measurement.id ? null : measurement.id
                                )}
                            >
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: 4
                                }}>
                                    <span style={{
                                        fontSize: 12,
                                        color: '#f1f5f9',
                                        fontWeight: 600
                                    }}>
                                        Measurement #{index + 1}
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeMeasurement(measurement.id);
                                        }}
                                        style={{
                                            padding: 2,
                                            background: 'rgba(239, 68, 68, 0.2)',
                                            color: '#ef4444',
                                            border: 'none',
                                            borderRadius: 3,
                                            fontSize: 10,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                                <div style={{
                                    fontSize: 14,
                                    color: '#fbbf24',
                                    fontWeight: 700,
                                    fontFamily: 'monospace'
                                }}>
                                    {formatDistance(measurement.distance)}
                                </div>
                                {measurement.label && (
                                    <div style={{
                                        fontSize: 10,
                                        color: '#94a3b8',
                                        marginTop: 2
                                    }}>
                                        {measurement.label}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Measurements */}
            {measurements.length === 0 && !measurementMode && (
                <div style={{
                    padding: 16,
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: 12
                }}>
                    No measurements yet.
                    <br />
                    Click "Start Measuring" to begin.
                </div>
            )}
        </div>
    );
};

// Main Measurement Tool Component
const MeasurementTool = ({ show = false }) => {
    if (!show) return null;

    return <MeasurementPanel />;
};

export default MeasurementTool;

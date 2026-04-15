// QuickStartGuide.js   Interactive guide for new enhanced features
import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Play, Zap, Map, Box, Ruler } from 'lucide-react';

const GUIDE_STEPS = [
    {
        id: 'welcome',
        title: 'Welcome to Enhanced Solar Survey',
        icon: '  ',
        content: (
            <div>
                <p style={{ marginBottom: 16, color: '#94a3b8', lineHeight: 1.6 }}>
                    Experience next-generation solar design with intelligent 2D/3D visualization,
                    smart panel placement, and real-time analysis.
                </p>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 12
                }}>
                    {[
                        { icon: '   ', label: 'Interactive Maps', desc: 'Satellite view with drawing tools' },
                        { icon: '   ', label: '3D Visualization', desc: 'Realistic 3D scene rendering' },
                        { icon: '  ', label: 'AI Panel Placement', desc: 'Smart auto-generation' },
                        { icon: '  ', label: 'Precise Measurements', desc: 'Real-time distance tools' }
                    ].map(feature => (
                        <div key={feature.label} style={{
                            padding: 12,
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            borderRadius: 8,
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: 24, marginBottom: 4 }}>{feature.icon}</div>
                            <div style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#3b82f6',
                                marginBottom: 2
                            }}>
                                {feature.label}
                            </div>
                            <div style={{
                                fontSize: 9,
                                color: '#64748b'
                            }}>
                                {feature.desc}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    },
    {
        id: 'view-modes',
        title: 'Master the View Modes',
        icon: '   ',
        content: (
            <div>
                <p style={{ marginBottom: 16, color: '#94a3b8', lineHeight: 1.6 }}>
                    Switch between different view modes to get the perfect perspective for your solar design work.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                        {
                            icon: Map,
                            label: '2D Map View',
                            desc: 'Draw areas on satellite imagery',
                            shortcut: 'Perfect for site surveying and area definition'
                        },
                        {
                            icon: Box,
                            label: '3D View',
                            desc: 'Interactive 3D visualization',
                            shortcut: 'Best for panel placement and shadow analysis'
                        },
                        {
                            icon: '  ',
                            label: 'Split View',
                            desc: 'Side-by-side 2D and 3D',
                            shortcut: 'Compare perspectives simultaneously'
                        }
                    ].map(mode => (
                        <div key={mode.label} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: 12,
                            background: 'rgba(55, 65, 81, 0.3)',
                            border: '1px solid rgba(75, 85, 99, 0.3)',
                            borderRadius: 8
                        }}>
                            {typeof mode.icon === 'string' ? (
                                <span style={{ fontSize: 20 }}>{mode.icon}</span>
                            ) : (
                                <mode.icon size={20} style={{ color: '#3b82f6' }} />
                            )}
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: '#f1f5f9',
                                    marginBottom: 2
                                }}>
                                    {mode.label}
                                </div>
                                <div style={{ fontSize: 10, color: '#64748b' }}>
                                    {mode.desc}   {mode.shortcut}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    },
    {
        id: 'drawing-tools',
        title: 'Drawing & Area Definition',
        icon: '  ',
        content: (
            <div>
                <p style={{ marginBottom: 16, color: '#94a3b8', lineHeight: 1.6 }}>
                    Start by defining installation areas using our intelligent drawing tools.
                </p>

                <div style={{
                    marginBottom: 16,
                    padding: 12,
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    borderRadius: 8
                }}>
                    <div style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#22c55e',
                        marginBottom: 4
                    }}>
                           Step-by-Step Process
                    </div>
                    <ol style={{
                        fontSize: 10,
                        color: '#64748b',
                        paddingLeft: 16,
                        lineHeight: 1.5
                    }}>
                        <li>Switch to <strong>2D Map View</strong></li>
                        <li>Use <strong>Draw Area</strong> tool to outline rooftops</li>
                        <li>Add <strong>Exclusion Zones</strong> for obstacles</li>
                        <li>Switch to <strong>3D View</strong> to see results</li>
                    </ol>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                        { tool: '   Draw Area', desc: 'Outline installation boundaries' },
                        { tool: '  Rectangle', desc: 'Quick rectangular areas' },
                        { tool: '   Exclude Area', desc: 'Mark obstacles and no-go zones' }
                    ].map(item => (
                        <div key={item.tool} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: 8,
                            background: 'rgba(55, 65, 81, 0.2)',
                            borderRadius: 6,
                            fontSize: 10
                        }}>
                            <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{item.tool}</span>
                            <span style={{ color: '#64748b' }}>{item.desc}</span>
                        </div>
                    ))}
                </div>
            </div>
        )
    },
    {
        id: 'smart-panels',
        title: 'AI-Powered Panel Placement',
        icon: '  ',
        content: (
            <div>
                <p style={{ marginBottom: 16, color: '#94a3b8', lineHeight: 1.6 }}>
                    Let our intelligent system automatically place solar panels for optimal performance.
                </p>

                <div style={{
                    marginBottom: 16,
                    padding: 12,
                    background: 'rgba(251, 191, 36, 0.1)',
                    border: '1px solid rgba(251, 191, 36, 0.2)',
                    borderRadius: 8
                }}>
                    <div style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#fbbf24',
                        marginBottom: 4
                    }}>
                          Smart Features
                    </div>
                    <ul style={{
                        fontSize: 10,
                        color: '#64748b',
                        paddingLeft: 16,
                        lineHeight: 1.5,
                        margin: 0
                    }}>
                        <li>Automatic optimal spacing calculation</li>
                        <li>Shadow avoidance algorithms</li>
                        <li>Boundary and exclusion zone respect</li>
                        <li>Real-time performance optimization</li>
                    </ul>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button style={{
                        padding: '8px 12px',
                        background: 'rgba(34, 197, 94, 0.2)',
                        color: '#22c55e',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'not-allowed',
                        opacity: 0.7
                    }}>
                          Auto-Generate Panels
                    </button>
                    <div style={{ fontSize: 9, color: '#64748b', textAlign: 'center' }}>
                        Available after defining areas
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'measurements',
        title: 'Precise Measurements',
        icon: '  ',
        content: (
            <div>
                <p style={{ marginBottom: 16, color: '#94a3b8', lineHeight: 1.6 }}>
                    Measure distances accurately in both 2D and 3D views for precise planning.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <Ruler size={32} style={{ color: '#fbbf24' }} />
                    <div>
                        <div style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#f1f5f9',
                            marginBottom: 2
                        }}>
                            Interactive Measurement Tool
                        </div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>
                            Click two points to measure distance
                        </div>
                    </div>
                </div>

                <div style={{
                    padding: 12,
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: 8,
                    marginBottom: 12
                }}>
                    <div style={{
                        fontSize: 10,
                        color: '#3b82f6',
                        fontWeight: 600,
                        marginBottom: 4
                    }}>
                           Pro Tips
                    </div>
                    <ul style={{
                        fontSize: 9,
                        color: '#64748b',
                        paddingLeft: 12,
                        lineHeight: 1.4,
                        margin: 0
                    }}>
                        <li>Measurements automatically convert units (cm   m   km)</li>
                        <li>All measurements are saved and can be exported</li>
                        <li>Toggle visibility with the eye icon</li>
                        <li>Delete individual measurements from the panel</li>
                    </ul>
                </div>
            </div>
        )
    },
    {
        id: 'getting-started',
        title: 'Ready to Start?',
        icon: '  ',
        content: (
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>  </div>
                <p style={{ marginBottom: 20, color: '#94a3b8', lineHeight: 1.6 }}>
                    You're all set! Start by switching to <strong>2D Map View</strong> and
                    drawing your first installation area.
                </p>

                <div style={{
                    padding: 16,
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: 12,
                    marginBottom: 20
                }}>
                    <div style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#3b82f6',
                        marginBottom: 8
                    }}>
                        Quick Start Checklist
                    </div>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        fontSize: 10,
                        textAlign: 'left'
                    }}>
                        {[
                            '  Switch to 2D Map View',
                            '  Draw installation areas',
                            '  Add exclusion zones if needed',
                            '  Switch to 3D View',
                            '  Generate panels automatically',
                            '  Analyze performance metrics'
                        ].map(item => (
                            <label key={item} style={{
                                color: '#64748b',
                                cursor: 'pointer',
                                userSelect: 'none'
                            }}>
                                {item}
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        )
    }
];

const QuickStartGuide = ({ show, onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);

    if (!show) return null;

    const step = GUIDE_STEPS[currentStep];
    const isFirst = currentStep === 0;
    const isLast = currentStep === GUIDE_STEPS.length - 1;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 20
        }}>
            <div style={{
                background: 'linear-gradient(135deg, rgba(2, 6, 23, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: 20,
                padding: 32,
                backdropFilter: 'blur(20px)',
                maxWidth: 520,
                width: '100%',
                maxHeight: '80vh',
                overflowY: 'auto',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
                position: 'relative'
            }}>
                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        padding: 8,
                        background: 'rgba(156, 163, 175, 0.2)',
                        color: '#9ca3af',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer'
                    }}
                >
                    <X size={16} />
                </button>

                {/* Progress Indicator */}
                <div style={{
                    display: 'flex',
                    gap: 4,
                    marginBottom: 24,
                    justifyContent: 'center'
                }}>
                    {GUIDE_STEPS.map((_, index) => (
                        <div
                            key={index}
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: index === currentStep
                                    ? '#3b82f6'
                                    : index < currentStep
                                        ? 'rgba(34, 197, 94, 0.6)'
                                        : 'rgba(156, 163, 175, 0.3)',
                                transition: 'all 0.3s ease'
                            }}
                        />
                    ))}
                </div>

                {/* Step Content */}
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>{step.icon}</div>
                    <h2 style={{
                        color: '#f1f5f9',
                        fontSize: 20,
                        fontWeight: 700,
                        marginBottom: 16,
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        {step.title}
                    </h2>
                </div>

                <div style={{ marginBottom: 32, textAlign: 'left' }}>
                    {step.content}
                </div>

                {/* Navigation */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <button
                        onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                        disabled={isFirst}
                        style={{
                            padding: '8px 16px',
                            background: isFirst ? 'rgba(156, 163, 175, 0.2)' : 'rgba(55, 65, 81, 0.3)',
                            color: isFirst ? '#9ca3af' : '#f1f5f9',
                            border: `1px solid ${isFirst ? 'rgba(156, 163, 175, 0.3)' : 'rgba(75, 85, 99, 0.3)'}`,
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: isFirst ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            opacity: isFirst ? 0.5 : 1
                        }}
                    >
                        <ChevronLeft size={14} />
                        Previous
                    </button>

                    <span style={{
                        fontSize: 11,
                        color: '#64748b',
                        fontWeight: 600
                    }}>
                        {currentStep + 1} of {GUIDE_STEPS.length}
                    </span>

                    <button
                        onClick={isLast ? onClose : () => setCurrentStep(Math.min(GUIDE_STEPS.length - 1, currentStep + 1))}
                        style={{
                            padding: '8px 16px',
                            background: isLast ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 'rgba(59, 130, 246, 0.3)',
                            color: 'white',
                            border: `1px solid ${isLast ? '#22c55e' : 'rgba(59, 130, 246, 0.4)'}`,
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            boxShadow: isLast ? '0 4px 12px rgba(34, 197, 94, 0.3)' : 'none'
                        }}
                    >
                        {isLast ? (
                            <>
                                <Play size={14} />
                                Start Building
                            </>
                        ) : (
                            <>
                                Next
                                <ChevronRight size={14} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuickStartGuide;

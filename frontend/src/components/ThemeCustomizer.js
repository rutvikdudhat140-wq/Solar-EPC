// Solar OS   Theme Customizer (Offcanvas Panel)
// Fixed settings gear icon   slide-in panel   ALL options dynamically functional
import React, { useState, useEffect, useRef } from 'react';
import {
    X, Sun, Moon, Monitor, Layout, Columns, PanelLeft,
    Square, Layers, Palette, RotateCcw, ChevronDown, Check,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/*                                            
   CONFIGURATION
                                               */

const SIDEBAR_COLORS = [
    { id: 'default', color: '#ffffff', border: '#e2e8f0' },
    { id: 'darkgreen', color: '#0f3d2e', border: '#0f3d2e' },
    { id: 'nightblue', color: '#0f1b33', border: '#0f1b33' },
    { id: 'darkgray', color: '#1a1a2e', border: '#1a1a2e' },
    { id: 'royalblue', color: '#1e3a5f', border: '#1e3a5f' },
    { id: 'indigo', color: '#1e1b4b', border: '#1e1b4b' },
];

const TOPBAR_COLORS = [
    { id: 'white', color: '#ffffff', border: '#e2e8f0' },
    { id: 'darkaqua', color: '#0f4c5c', border: '#0f4c5c' },
    { id: 'sage', color: '#87a878', border: '#87a878' },
    { id: 'teal', color: '#0d9488', border: '#0d9488' },
    { id: 'steel', color: '#475569', border: '#475569' },
    { id: 'orange-grad', gradient: 'linear-gradient(135deg, #f97316, #ef4444)', border: '#f97316' },
    { id: 'purple-grad', gradient: 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: '#8b5cf6' },
    { id: 'blue-grad', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: '#3b82f6' },
    { id: 'rose-grad', gradient: 'linear-gradient(135deg, #f43f5e, #e11d48)', border: '#f43f5e' },
];

const THEME_COLORS = [
    { id: 'primary', color: '#f26522' },
    { id: 'blue', color: '#3b82f6' },
    { id: 'green', color: '#22c55e' },
    { id: 'purple', color: '#8b5cf6' },
    { id: 'rose', color: '#f43f5e' },
    { id: 'amber', color: '#f59e0b' },
    { id: 'red', color: '#ef4444' },
];

const SIDEBAR_BG_IMAGES = [
    { id: 'bg1', thumb: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { id: 'bg2', thumb: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { id: 'bg3', thumb: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { id: 'bg4', thumb: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
    { id: 'bg5', thumb: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
    { id: 'bg6', thumb: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
];

const LAYOUT_OPTIONS = [
    { id: 'default', label: 'Default' },
    { id: 'mini', label: 'Mini' },
    { id: 'horizontal', label: 'Horizontal' },
    { id: 'twocolumn', label: 'Two Column' },
    { id: 'detached', label: 'Detached' },
    { id: 'overlay', label: 'Overlay' },
];

const SIDEBAR_SIZES = [
    { id: 'default', label: 'Default' },
    { id: 'compact', label: 'Compact' },
    { id: 'hover', label: 'Hover View' },
];

/*                                            
   ACCORDION SECTION
                                               */
const Section = ({ title, icon: Icon, defaultOpen = true, children }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-[var(--border-base)] last:border-b-0">
            <button
                onClick={() => setIsOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-left group transition-colors hover:bg-[var(--bg-hover)]"
            >
                <div className="flex items-center gap-2.5">
                    {Icon && <Icon size={14} className="text-[var(--accent)]" />}
                    <span className="text-[13px] font-semibold text-[var(--text-primary)]">{title}</span>
                </div>
                <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown size={14} className="text-[var(--text-faint)]" />
                </div>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-5 pb-4 pt-1">{children}</div>
            </div>
        </div>
    );
};

/*                                            
   LAYOUT OPTION CARD
                                               */
const LayoutCard = ({ label, active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`relative flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all duration-200 cursor-pointer group ${active
            ? 'border-[var(--accent)] bg-[var(--accent)]/8 shadow-[0_0_0_1px_var(--accent),0_4px_12px_var(--accent-glow)]'
            : 'border-[var(--border-base)] hover:border-[var(--border-muted)] hover:bg-[var(--bg-hover)]'
            }`}
    >
        <div className="w-full h-14 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] overflow-hidden flex items-center justify-center">
            {children}
        </div>
        <span className={`text-[10px] font-medium leading-tight text-center ${active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
            }`}>{label}</span>
        {active && (
            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--accent)] flex items-center justify-center shadow-lg">
                <Check size={9} className="text-white" strokeWidth={3} />
            </div>
        )}
    </button>
);

/*                                            
   COLOR SWATCH
                                               */
const ColorSwatch = ({ color, gradient, active, onClick }) => (
    <button
        onClick={onClick}
        className={`w-8 h-8 rounded-full border-2 transition-all duration-200 relative flex items-center justify-center shrink-0 ${active
            ? 'border-[var(--accent)] scale-110 shadow-[0_0_0_2px_var(--bg-surface),0_0_0_4px_var(--accent)]'
            : 'border-[var(--border-base)] hover:scale-105 hover:border-[var(--border-muted)]'
            }`}
        style={{ background: gradient || color }}
    >
        {active && <Check size={12} className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" strokeWidth={3} />}
    </button>
);

/*                                            
   RADIO PILL
                                               */
const RadioPill = ({ icon: Icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all duration-200 flex-1 ${active
            ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] shadow-[0_0_12px_var(--accent-glow)]'
            : 'border-[var(--border-base)] text-[var(--text-muted)] hover:border-[var(--border-muted)] hover:text-[var(--text-secondary)]'
            }`}
    >
        {Icon && <Icon size={15} className={active ? 'text-[var(--accent)]' : ''} />}
        <span className="text-xs font-semibold">{label}</span>
    </button>
);

/*                                            
   LAYOUT THUMBNAILS (SVG mini previews)
                                               */
const LayoutThumb = ({ type }) => {
    const bar = 'var(--accent)';
    const bg = 'var(--bg-raised)';
    const line = 'var(--border-muted)';
    const thumbs = {
        default: (
            <svg viewBox="0 0 60 40" className="w-full h-full">
                <rect x="0" y="0" width="14" height="40" fill={bar} opacity="0.2" rx="2" />
                <rect x="0" y="0" width="60" height="8" fill={bar} opacity="0.15" rx="2" />
                <rect x="17" y="11" width="18" height="6" fill={line} opacity="0.3" rx="1" />
                <rect x="38" y="11" width="18" height="6" fill={line} opacity="0.3" rx="1" />
                <rect x="17" y="20" width="40" height="17" fill={bg} opacity="0.4" rx="1" />
            </svg>
        ),
        mini: (
            <svg viewBox="0 0 60 40" className="w-full h-full">
                <rect x="0" y="0" width="6" height="40" fill={bar} opacity="0.2" rx="1" />
                <rect x="0" y="0" width="60" height="8" fill={bar} opacity="0.15" rx="2" />
                <rect x="9" y="11" width="22" height="6" fill={line} opacity="0.3" rx="1" />
                <rect x="34" y="11" width="22" height="6" fill={line} opacity="0.3" rx="1" />
                <rect x="9" y="20" width="48" height="17" fill={bg} opacity="0.4" rx="1" />
            </svg>
        ),
        horizontal: (
            <svg viewBox="0 0 60 40" className="w-full h-full">
                <rect x="0" y="0" width="60" height="8" fill={bar} opacity="0.15" rx="2" />
                <rect x="0" y="8" width="60" height="5" fill={bar} opacity="0.1" rx="1" />
                <rect x="3" y="16" width="26" height="6" fill={line} opacity="0.3" rx="1" />
                <rect x="32" y="16" width="24" height="6" fill={line} opacity="0.3" rx="1" />
                <rect x="3" y="25" width="54" height="12" fill={bg} opacity="0.4" rx="1" />
            </svg>
        ),
        twocolumn: (
            <svg viewBox="0 0 60 40" className="w-full h-full">
                <rect x="0" y="0" width="6" height="40" fill={bar} opacity="0.25" rx="1" />
                <rect x="6" y="0" width="10" height="40" fill={bar} opacity="0.12" rx="1" />
                <rect x="16" y="0" width="44" height="8" fill={bar} opacity="0.12" rx="2" />
                <rect x="19" y="11" width="18" height="6" fill={line} opacity="0.3" rx="1" />
                <rect x="40" y="11" width="18" height="6" fill={line} opacity="0.3" rx="1" />
                <rect x="19" y="20" width="38" height="17" fill={bg} opacity="0.4" rx="1" />
            </svg>
        ),
        detached: (
            <svg viewBox="0 0 60 40" className="w-full h-full">
                <rect x="2" y="2" width="12" height="36" fill={bar} opacity="0.2" rx="3" />
                <rect x="0" y="0" width="60" height="8" fill={bar} opacity="0.12" rx="2" />
                <rect x="17" y="11" width="18" height="6" fill={line} opacity="0.3" rx="1" />
                <rect x="38" y="11" width="18" height="6" fill={line} opacity="0.3" rx="1" />
                <rect x="17" y="20" width="40" height="17" fill={bg} opacity="0.4" rx="1" />
            </svg>
        ),
        overlay: (
            <svg viewBox="0 0 60 40" className="w-full h-full">
                <rect x="0" y="0" width="60" height="40" fill={bg} opacity="0.3" rx="2" />
                <rect x="2" y="2" width="14" height="36" fill={bar} opacity="0.18" rx="2" />
                <rect x="19" y="5" width="18" height="5" fill={line} opacity="0.3" rx="1" />
                <rect x="19" y="14" width="38" height="22" fill={line} opacity="0.1" rx="1" />
            </svg>
        ),
    };
    return thumbs[type] || thumbs.default;
};

/*                                            
   MAIN COMPONENT
                                               */
const ThemeCustomizer = () => {
    const [open, setOpen] = useState(false);
    const { theme, setTheme, themes, customization, setCustomization, resetCustomization } = useTheme();
    const panelRef = useRef(null);

    // Close on Escape
    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        if (open) window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [open]);

    // Close on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (open && panelRef.current && !panelRef.current.contains(e.target) && !e.target.closest('.theme-customizer-trigger')) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    const handleReset = () => {
        resetCustomization();
        setOpen(false);
    };

    const c = customization;

    return (
        <>
            {/*      FLOATING TRIGGER BUTTON      */}
            <button
                onClick={() => setOpen(o => !o)}
                className="theme-customizer-trigger fixed right-0 z-[9999] flex items-center justify-center w-11 h-11 rounded-l-xl shadow-2xl transition-all duration-300 hover:w-12 group"
                style={{
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: `linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)`,
                    boxShadow: `0 10px 25px -5px var(--primary-glow), 0 8px 10px -6px var(--primary-glow)`,
                }}
                title="Theme Customizer"
            >
                <svg
                    className="w-5 h-5 text-white animate-spin-slow group-hover:animate-spin-fast"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>

            {/*      BACKDROP      */}
            <div
                className={`fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={() => setOpen(false)}
            />

            {/*      OFFCANVAS PANEL      */}
            <div
                ref={panelRef}
                className={`fixed top-0 right-0 z-[10001] h-full w-[360px] max-w-[90vw] flex flex-col transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'translate-x-0' : 'translate-x-full'
                    }`}
                style={{
                    background: 'var(--bg-surface)',
                    borderLeft: '1px solid var(--border-base)',
                    boxShadow: open ? '-8px 0 40px rgba(0,0,0,0.25), -2px 0 8px rgba(0,0,0,0.1)' : 'none',
                }}
            >
                {/*    HEADER    */}
                <div
                    className="flex items-center justify-between px-5 py-4 shrink-0"
                    style={{
                        background: `linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)`,
                        borderBottom: '1px solid var(--border-base)',
                    }}
                >
                    <div>
                        <h3 className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--primary)' }}>Theme Customizer</h3>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Choose your themes & layouts etc.</p>
                    </div>
                    <button
                        onClick={() => setOpen(false)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:rotate-90"
                        style={{
                            background: 'var(--bg-hover)',
                            color: 'var(--text-muted)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--primary)';
                            e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--bg-hover)';
                            e.currentTarget.style.color = 'var(--text-muted)';
                        }}
                    >
                        <X size={15} />
                    </button>
                </div>

                {/*    BODY (scrollable)    */}
                <div className="flex-1 overflow-y-auto overscroll-contain">

                    {/*     SELECT LAYOUTS     */}
                    <Section title="Select Layouts" icon={Layout}>
                        <div className="grid grid-cols-3 gap-2.5">
                            {LAYOUT_OPTIONS.map(opt => (
                                <LayoutCard
                                    key={opt.id}
                                    label={opt.label}
                                    active={c.layout === opt.id}
                                    onClick={() => setCustomization({ layout: opt.id })}
                                >
                                    <LayoutThumb type={opt.id} />
                                </LayoutCard>
                            ))}
                        </div>
                    </Section>

                    {/*     LAYOUT WIDTH     */}
                    <Section title="Layout Width" icon={Columns} defaultOpen={false}>
                        <div className="flex gap-3">
                            <RadioPill
                                icon={Monitor}
                                label="Fluid Layout"
                                active={c.layoutWidth === 'fluid'}
                                onClick={() => setCustomization({ layoutWidth: 'fluid' })}
                            />
                            <RadioPill
                                icon={Square}
                                label="Boxed Layout"
                                active={c.layoutWidth === 'boxed'}
                                onClick={() => setCustomization({ layoutWidth: 'boxed' })}
                            />
                        </div>
                    </Section>

                    {/*     CARD LAYOUT     */}
                    <Section title="Card Layout" icon={Layers} defaultOpen={false}>
                        <div className="grid grid-cols-3 gap-2.5">
                            {['bordered', 'borderless', 'shadow'].map(opt => (
                                <LayoutCard
                                    key={opt}
                                    label={opt.charAt(0).toUpperCase() + opt.slice(1)}
                                    active={c.cardLayout === opt}
                                    onClick={() => setCustomization({ cardLayout: opt })}
                                >
                                    <div className="w-10 h-8 rounded-md" style={{
                                        background: 'var(--bg-raised)',
                                        border: opt === 'bordered' ? '1.5px solid var(--border-muted)' : 'none',
                                        boxShadow: opt === 'shadow' ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                                    }} />
                                </LayoutCard>
                            ))}
                        </div>
                    </Section>

                    {/*     SIDEBAR COLOR     */}
                    <Section title="Sidebar Color" icon={PanelLeft} defaultOpen={false}>
                        <div className="flex items-center gap-3 flex-wrap">
                            {SIDEBAR_COLORS.map(sc => (
                                <ColorSwatch
                                    key={sc.id}
                                    color={sc.color}
                                    active={c.sidebarColor === sc.id}
                                    onClick={() => setCustomization({ sidebarColor: sc.id })}
                                />
                            ))}
                        </div>
                    </Section>

                    {/*     COLOR MODE     */}
                    <Section title="Color Mode" icon={Palette}>
                        <div className="grid grid-cols-2 gap-3">
                            {themes.map(t => {
                                const active = theme === t.key;
                                const Icon = t.isDark ? Moon : Sun;
                                return (
                                    <button
                                        key={t.key}
                                        onClick={() => setTheme(t.key)}
                                        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 transition-all duration-200 ${active
                                            ? 'border-[var(--accent)] bg-[var(--accent)]/10 shadow-[0_0_16px_var(--accent-glow)]'
                                            : 'border-[var(--border-base)] hover:border-[var(--border-muted)] hover:bg-[var(--bg-hover)]'
                                            }`}
                                    >
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${active ? 'bg-[var(--accent)]/20' : 'bg-[var(--bg-elevated)]'
                                            }`}>
                                            <Icon size={14} className={active ? 'text-[var(--accent)]' : 'text-[var(--text-faint)]'} />
                                        </div>
                                        <span className={`text-xs font-semibold ${active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
                                            }`}>{t.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </Section>

                    {/*     SIDEBAR SIZE     */}
                    <Section title="Sidebar Size" icon={PanelLeft} defaultOpen={false}>
                        <div className="grid grid-cols-3 gap-2.5">
                            {SIDEBAR_SIZES.map(opt => (
                                <LayoutCard
                                    key={opt.id}
                                    label={opt.label}
                                    active={c.sidebarSize === opt.id}
                                    onClick={() => setCustomization({ sidebarSize: opt.id })}
                                >
                                    <LayoutThumb type={opt.id === 'compact' ? 'mini' : opt.id === 'hover' ? 'overlay' : 'default'} />
                                </LayoutCard>
                            ))}
                        </div>
                    </Section>

                    {/*     TOP BAR COLOR     */}
                    <Section title="Top Bar Color" icon={Palette} defaultOpen={false}>
                        <div className="flex items-center gap-3 flex-wrap">
                            {TOPBAR_COLORS.map(tc => (
                                <ColorSwatch
                                    key={tc.id}
                                    color={tc.color}
                                    gradient={tc.gradient}
                                    active={c.topbarColor === tc.id}
                                    onClick={() => setCustomization({ topbarColor: tc.id })}
                                />
                            ))}
                        </div>
                    </Section>

                    {/*     SIDEBAR BACKGROUND     */}
                    <Section title="Sidebar Background" defaultOpen={false}>
                        <div className="flex items-center gap-3 flex-wrap">
                            {SIDEBAR_BG_IMAGES.map(bg => (
                                <button
                                    key={bg.id}
                                    onClick={() => setCustomization({ sidebarBg: bg.id === c.sidebarBg ? null : bg.id })}
                                    className={`w-12 h-12 rounded-xl border-2 transition-all duration-200 overflow-hidden relative ${c.sidebarBg === bg.id
                                        ? 'border-[var(--accent)] scale-110 shadow-[0_0_0_2px_var(--bg-surface),0_0_0_4px_var(--accent)]'
                                        : 'border-[var(--border-base)] hover:scale-105 hover:border-[var(--border-muted)]'
                                        }`}
                                    style={{ background: bg.thumb }}
                                >
                                    {c.sidebarBg === bg.id && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                            <Check size={14} className="text-white" strokeWidth={3} />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </Section>

                    {/*     THEME COLORS     */}
                    <Section title="Theme Colors" icon={Palette} defaultOpen={false}>
                        <div className="flex items-center gap-3 flex-wrap">
                            {THEME_COLORS.map(tc => (
                                <ColorSwatch
                                    key={tc.id}
                                    color={tc.color}
                                    active={c.themeColor === tc.id}
                                    onClick={() => setCustomization({ themeColor: tc.id })}
                                />
                            ))}
                        </div>
                    </Section>

                </div>

                {/*    FOOTER    */}
                <div className="shrink-0 p-4 border-t border-[var(--border-base)]" style={{ background: 'var(--bg-raised)' }}>
                    <div className="flex gap-3">
                        <button
                            onClick={handleReset}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-[var(--border-base)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-muted)] transition-all duration-200"
                        >
                            <RotateCcw size={13} />
                            Reset
                        </button>
                        <button
                            onClick={() => setOpen(false)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all duration-200 hover:shadow-lg hover:scale-105"
                            style={{
                                background: `linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)`,
                                boxShadow: `0 4px 14px var(--primary-glow)`,
                            }}
                        >
                            Apply & Close
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ThemeCustomizer;

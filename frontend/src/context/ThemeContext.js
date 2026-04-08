/**
 * ThemeContext.js
 * Solar OS — multi-theme engine
 *
 * Design System:
 *  --primary = #2563EB  (Blue  — buttons, links, active nav, focus rings)
 *  --accent  = #F59E0B  (Solar Yellow — highlights, KPI icons, badges only)
 *  No purple / violet anywhere.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const THEMES = {

    dark: {
        label: 'Dark',
        isDark: true,
        vars: {
            '--bg-page': '#020617',
            '--bg-surface': '#0b1220',
            '--bg-raised': '#0f1829',
            '--bg-elevated': '#131e32',
            '--bg-overlay': '#18253d',
            '--bg-hover': 'rgba(37,99,235,0.07)',
            '--bg-topbar': 'rgba(2,6,23,0.88)',
            '--bg-sidebar': 'rgba(2,6,23,0.97)',
            '--border-base': 'rgba(255,255,255,0.07)',
            '--border-muted': 'rgba(255,255,255,0.11)',
            '--border-active': 'rgba(37,99,235,0.55)',
            '--text-primary': '#f1f5f9',
            '--text-secondary': '#94a3b8',
            '--text-muted': '#64748b',
            '--text-faint': '#475569',
            '--primary': '#2563eb',
            '--primary-light': '#3b82f6',
            '--primary-hover': '#1d4ed8',
            '--primary-glow': 'rgba(37,99,235,0.25)',
            '--primary-inv': '#ffffff',
            '--accent': '#f59e0b',
            '--accent-light': '#fbbf24',
            '--accent-glow': 'rgba(245,158,11,0.22)',
            '--accent-inv': '#020617',
            '--solar': '#f59e0b',
            '--solar-light': '#fcd34d',
            '--solar-glow': 'rgba(245,158,11,0.18)',
            '--green': '#22c55e', '--green-bg': 'rgba(34,197,94,0.10)',
            '--red': '#ef4444', '--red-bg': 'rgba(239,68,68,0.10)',
            '--amber': '#f59e0b', '--amber-bg': 'rgba(245,158,11,0.12)',
            '--blue': '#3b82f6', '--blue-bg': 'rgba(59,130,246,0.10)',
            '--cyan': '#22d3ee', '--cyan-bg': 'rgba(34,211,238,0.10)',
            '--chart-grid': 'rgba(255,255,255,0.05)',
            '--tab-active-overlay': 'rgba(255,255,255,0.18)',
            '--skeleton-base': 'rgba(255,255,255,0.05)',
            '--skeleton-shine': 'rgba(255,255,255,0.10)',
        },
    },

    light: {
        label: 'Light',
        isDark: false,
        vars: {
            '--bg-page': '#f1f5f9',
            '--bg-surface': '#ffffff',
            '--bg-raised': '#f8fafc',
            '--bg-elevated': '#f1f5f9',
            '--bg-overlay': '#e2e8f0',
            '--bg-hover': 'rgba(37,99,235,0.06)',
            '--bg-topbar': 'rgba(255,255,255,0.92)',
            '--bg-sidebar': 'rgba(255,255,255,0.98)',
            '--border-base': 'rgba(15,23,42,0.10)',
            '--border-muted': 'rgba(15,23,42,0.15)',
            '--border-active': 'rgba(37,99,235,0.50)',
            '--text-primary': '#0f172a',
            '--text-secondary': '#334155',
            '--text-muted': '#64748b',
            '--text-faint': '#94a3b8',
            '--primary': '#2563eb',
            '--primary-light': '#3b82f6',
            '--primary-hover': '#1d4ed8',
            '--primary-glow': 'rgba(37,99,235,0.18)',
            '--primary-inv': '#ffffff',
            '--accent': '#d97706',
            '--accent-light': '#b45309',
            '--accent-glow': 'rgba(217,119,6,0.18)',
            '--accent-inv': '#ffffff',
            '--solar': '#d97706',
            '--solar-light': '#b45309',
            '--solar-glow': 'rgba(217,119,6,0.16)',
            '--green': '#15803d', '--green-bg': 'rgba(21,128,61,0.08)',
            '--red': '#b91c1c', '--red-bg': 'rgba(185,28,28,0.08)',
            '--amber': '#b45309', '--amber-bg': 'rgba(180,83,9,0.09)',
            '--blue': '#1d4ed8', '--blue-bg': 'rgba(29,78,216,0.08)',
            '--cyan': '#0e7490', '--cyan-bg': 'rgba(14,116,144,0.08)',
            '--chart-grid': 'rgba(15,23,42,0.07)',
            '--tab-active-overlay': 'rgba(0,0,0,0.08)',
            '--skeleton-base': 'rgba(0,0,0,0.06)',
            '--skeleton-shine': 'rgba(255,255,255,0.50)',
        },
    },

    solar: {
        label: 'Solar',
        isDark: true,
        vars: {
            '--bg-page': '#0a0800',
            '--bg-surface': '#110f00',
            '--bg-raised': '#181200',
            '--bg-elevated': '#1e1600',
            '--bg-overlay': '#261c00',
            '--bg-hover': 'rgba(245,158,11,0.08)',
            '--bg-topbar': 'rgba(10,8,0,0.92)',
            '--bg-sidebar': 'rgba(10,8,0,0.98)',
            '--border-base': 'rgba(245,158,11,0.10)',
            '--border-muted': 'rgba(245,158,11,0.18)',
            '--border-active': 'rgba(245,158,11,0.55)',
            '--text-primary': '#fff8e6',
            '--text-secondary': '#d4ba80',
            '--text-muted': '#8a7040',
            '--text-faint': '#5a4d2a',
            '--primary': '#f97316',
            '--primary-light': '#fb923c',
            '--primary-hover': '#ea6a10',
            '--primary-glow': 'rgba(249,115,22,0.25)',
            '--primary-inv': '#1a1100',
            '--accent': '#f59e0b',
            '--accent-light': '#fcd34d',
            '--accent-glow': 'rgba(245,158,11,0.28)',
            '--accent-inv': '#1a1100',
            '--solar': '#f97316',
            '--solar-light': '#fdba74',
            '--solar-glow': 'rgba(249,115,22,0.22)',
            '--green': '#22c55e', '--green-bg': 'rgba(34,197,94,0.10)',
            '--red': '#ef4444', '--red-bg': 'rgba(239,68,68,0.10)',
            '--amber': '#f59e0b', '--amber-bg': 'rgba(245,158,11,0.14)',
            '--blue': '#3b82f6', '--blue-bg': 'rgba(59,130,246,0.10)',
            '--cyan': '#06b6d4', '--cyan-bg': 'rgba(6,182,212,0.10)',
            '--chart-grid': 'rgba(245,158,11,0.06)',
            '--tab-active-overlay': 'rgba(255,255,255,0.15)',
            '--skeleton-base': 'rgba(255,255,255,0.04)',
            '--skeleton-shine': 'rgba(255,255,255,0.08)',
        },
    },
};

const STORAGE_KEY = 'solar-os-theme';
const CUSTOM_KEY = 'solar-os-customization';
const DEFAULT_THEME = 'dark';
const THEME_ORDER = Object.keys(THEMES);

/* ── Default customization values ── */
const DEFAULT_CUSTOM = {
    layout: 'default',
    layoutWidth: 'fluid',
    cardLayout: 'bordered',
    sidebarColor: 'default',
    sidebarSize: 'default',
    topbarColor: 'white',
    themeColor: 'primary',
    sidebarBg: null,
};

/* ── Theme color palettes (PRIMARY override for full app theming) ── */
const THEME_COLOR_MAP = {
    primary: {
        '--primary': '#f26522',
        '--primary-light': '#f97b45',
        '--primary-hover': '#d94e0f',
        '--primary-glow': 'rgba(242,101,34,0.25)',
        '--primary-inv': '#ffffff',
        '--border-active': 'rgba(242,101,34,0.50)',
        '--bg-hover': 'rgba(242,101,34,0.07)',
    },
    blue: {
        '--primary': '#3b82f6',
        '--primary-light': '#60a5fa',
        '--primary-hover': '#2563eb',
        '--primary-glow': 'rgba(59,130,246,0.25)',
        '--primary-inv': '#ffffff',
        '--border-active': 'rgba(59,130,246,0.50)',
        '--bg-hover': 'rgba(59,130,246,0.07)',
    },
    green: {
        '--primary': '#22c55e',
        '--primary-light': '#4ade80',
        '--primary-hover': '#16a34a',
        '--primary-glow': 'rgba(34,197,94,0.25)',
        '--primary-inv': '#ffffff',
        '--border-active': 'rgba(34,197,94,0.50)',
        '--bg-hover': 'rgba(34,197,94,0.07)',
    },
    purple: {
        '--primary': '#8b5cf6',
        '--primary-light': '#a78bfa',
        '--primary-hover': '#7c3aed',
        '--primary-glow': 'rgba(139,92,246,0.25)',
        '--primary-inv': '#ffffff',
        '--border-active': 'rgba(139,92,246,0.50)',
        '--bg-hover': 'rgba(139,92,246,0.07)',
    },
    rose: {
        '--primary': '#f43f5e',
        '--primary-light': '#fb7185',
        '--primary-hover': '#e11d48',
        '--primary-glow': 'rgba(244,63,94,0.25)',
        '--primary-inv': '#ffffff',
        '--border-active': 'rgba(244,63,94,0.50)',
        '--bg-hover': 'rgba(244,63,94,0.07)',
    },
    amber: {
        '--primary': '#f59e0b',
        '--primary-light': '#fbbf24',
        '--primary-hover': '#d97706',
        '--primary-glow': 'rgba(245,158,11,0.25)',
        '--primary-inv': '#ffffff',
        '--border-active': 'rgba(245,158,11,0.50)',
        '--bg-hover': 'rgba(245,158,11,0.07)',
    },
    red: {
        '--primary': '#ef4444',
        '--primary-light': '#f87171',
        '--primary-hover': '#dc2626',
        '--primary-glow': 'rgba(239,68,68,0.25)',
        '--primary-inv': '#ffffff',
        '--border-active': 'rgba(239,68,68,0.50)',
        '--bg-hover': 'rgba(239,68,68,0.07)',
    },
};

/* ── Sidebar color overrides ── */
const SIDEBAR_COLOR_MAP = {
    default: null, // uses theme default
    darkgreen: { bg: '#0f3d2e', text: '#d1fae5', muted: '#6ee7b7' },
    nightblue: { bg: '#0f1b33', text: '#e0e7ff', muted: '#93a5cf' },
    darkgray: { bg: '#1a1a2e', text: '#e2e8f0', muted: '#94a3b8' },
    royalblue: { bg: '#1e3a5f', text: '#dbeafe', muted: '#93b5e0' },
    indigo: { bg: '#1e1b4b', text: '#e0e7ff', muted: '#a5b4fc' },
};

/* ── Topbar color overrides ── */
const TOPBAR_COLOR_MAP = {
    white: null, // uses theme default
    darkaqua: { bg: '#0f4c5c', text: '#ffffff', border: 'rgba(255,255,255,0.08)' },
    sage: { bg: '#87a878', text: '#ffffff', border: 'rgba(255,255,255,0.12)' },
    teal: { bg: '#0d9488', text: '#ffffff', border: 'rgba(255,255,255,0.10)' },
    steel: { bg: '#475569', text: '#f1f5f9', border: 'rgba(255,255,255,0.08)' },
    'orange-grad': { bg: 'linear-gradient(135deg, #f97316, #ef4444)', text: '#ffffff', border: 'rgba(255,255,255,0.10)' },
    'purple-grad': { bg: 'linear-gradient(135deg, #8b5cf6, #6366f1)', text: '#ffffff', border: 'rgba(255,255,255,0.10)' },
    'blue-grad': { bg: 'linear-gradient(135deg, #3b82f6, #2563eb)', text: '#ffffff', border: 'rgba(255,255,255,0.10)' },
    'rose-grad': { bg: 'linear-gradient(135deg, #f43f5e, #e11d48)', text: '#ffffff', border: 'rgba(255,255,255,0.10)' },
};

/* ── Sidebar background gradients ── */
const SIDEBAR_BG_MAP = {
    bg1: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    bg2: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    bg3: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    bg4: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    bg5: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    bg6: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
};

function applyTheme(themeKey) {
    const t = THEMES[themeKey] || THEMES[DEFAULT_THEME];
    const root = document.documentElement;
    Object.entries(t.vars).forEach(([prop, val]) => root.style.setProperty(prop, val));
    root.setAttribute('data-theme', themeKey);
    document.body.style.backgroundColor = t.vars['--bg-page'];
}

function applyCustomization(custom) {
    const root = document.documentElement;

    // Layout data attribute (used by CSS)
    root.setAttribute('data-layout', custom.layout);
    root.setAttribute('data-layout-width', custom.layoutWidth);
    root.setAttribute('data-card-layout', custom.cardLayout);
    root.setAttribute('data-sidebar-size', custom.sidebarSize);
    root.setAttribute('data-sidebar-color', custom.sidebarColor);
    root.setAttribute('data-topbar-color', custom.topbarColor);

    // Theme primary color override (applies selected color globally)
    const primaryOverride = THEME_COLOR_MAP[custom.themeColor];
    if (primaryOverride) {
        Object.entries(primaryOverride).forEach(([prop, val]) => root.style.setProperty(prop, val));
    }

    // Sidebar color CSS vars
    const sc = SIDEBAR_COLOR_MAP[custom.sidebarColor];
    if (sc) {
        root.style.setProperty('--sidebar-bg-custom', sc.bg);
        root.style.setProperty('--sidebar-text-custom', sc.text);
        root.style.setProperty('--sidebar-muted-custom', sc.muted);
    } else {
        root.style.removeProperty('--sidebar-bg-custom');
        root.style.removeProperty('--sidebar-text-custom');
        root.style.removeProperty('--sidebar-muted-custom');
    }

    // Topbar color CSS vars
    const tc = TOPBAR_COLOR_MAP[custom.topbarColor];
    if (tc) {
        root.style.setProperty('--topbar-bg-custom', tc.bg);
        root.style.setProperty('--topbar-text-custom', tc.text);
        root.style.setProperty('--topbar-border-custom', tc.border);
    } else {
        root.style.removeProperty('--topbar-bg-custom');
        root.style.removeProperty('--topbar-text-custom');
        root.style.removeProperty('--topbar-border-custom');
    }

    // Sidebar background gradient
    const sbg = custom.sidebarBg && SIDEBAR_BG_MAP[custom.sidebarBg];
    if (sbg) {
        root.style.setProperty('--sidebar-bg-image', sbg);
    } else {
        root.style.removeProperty('--sidebar-bg-image');
    }
}

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
    const [theme, setThemeState] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved && THEMES[saved] ? saved : DEFAULT_THEME;
    });

    const [customization, setCustomizationState] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(CUSTOM_KEY));
            return saved ? { ...DEFAULT_CUSTOM, ...saved } : { ...DEFAULT_CUSTOM };
        } catch { return { ...DEFAULT_CUSTOM }; }
    });

    useEffect(() => {
        applyTheme(theme);
        localStorage.setItem(STORAGE_KEY, theme);
        // Re-apply primary color override after base theme
        const primaryOverride = THEME_COLOR_MAP[customization.themeColor];
        if (primaryOverride) {
            Object.entries(primaryOverride).forEach(([prop, val]) =>
                document.documentElement.style.setProperty(prop, val));
        }
    }, [theme, customization.themeColor]);

    useEffect(() => {
        applyCustomization(customization);
        localStorage.setItem(CUSTOM_KEY, JSON.stringify(customization));
    }, [customization]);

    const setTheme = useCallback((key) => {
        if (THEMES[key]) setThemeState(key);
    }, []);

    const toggleTheme = useCallback(() => {
        const idx = THEME_ORDER.indexOf(theme);
        setThemeState(THEME_ORDER[(idx + 1) % THEME_ORDER.length]);
    }, [theme]);

    const setCustomization = useCallback((updates) => {
        setCustomizationState(prev => ({ ...prev, ...updates }));
    }, []);

    const resetCustomization = useCallback(() => {
        setCustomizationState({ ...DEFAULT_CUSTOM });
        setThemeState(DEFAULT_THEME);
    }, []);

    const value = {
        theme,
        setTheme,
        toggleTheme,
        themes: THEME_ORDER.map(key => ({ key, label: THEMES[key].label, isDark: THEMES[key].isDark })),
        isDark: THEMES[theme]?.isDark ?? true,
        currentLabel: THEMES[theme]?.label ?? 'Dark',
        customization,
        setCustomization,
        resetCustomization,
    };

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
    return ctx;
};

export { THEMES };
export default ThemeContext;

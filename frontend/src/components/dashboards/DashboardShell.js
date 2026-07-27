/**
 * DashboardShell.js   Shared primitives for all role dashboards
 * Theme-aware: uses CSS variables exclusively, no hardcoded colors.
 */
import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { ResponsiveContainer, Tooltip } from 'recharts';

/*     Formatters                                                 */
export const fmtCurrency = (v) => {
    if (v >= 10000000) return ` ${(v / 10000000).toFixed(1)}Cr`;
    if (v >= 100000) return ` ${(v / 100000).toFixed(1)}L`;
    if (v >= 1000) return ` ${(v / 1000).toFixed(1)}K`;
    return ` ${v}`;
};
export const fmtNum = (v) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return String(v ?? 0);
};
export const fmtPct = (v) => `${(+v || 0).toFixed(1)}%`;

/*     Stat Card                                                  */
export const StatCard = ({ label, value, sub, icon: Icon, accent = 'var(--primary)', trend, trendUp }) => (
    <div className="glass-card p-5 flex flex-col gap-3 group cursor-default hover:border-[var(--border-active)] transition-all duration-200">
        <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
                <p className="label-muted mb-2">{label}</p>
                <p className="text-[1.6rem] font-extrabold text-[var(--text-primary)] tabular-nums leading-none tracking-tight">
                    {value}
                </p>
                {sub && <p className="text-[11px] text-[var(--text-muted)] mt-1.5">{sub}</p>}
                {trend && (
                    <div className="flex items-center gap-1 mt-2">
                        {trendUp === true && <ArrowUpRight size={12} style={{ color: 'var(--green)' }} />}
                        {trendUp === false && <ArrowDownRight size={12} style={{ color: 'var(--red)' }} />}
                        {trendUp === null && <Minus size={12} style={{ color: 'var(--text-muted)' }} />}
                        <span className="text-[11px] font-semibold" style={{
                            color: trendUp === true ? 'var(--green)' : trendUp === false ? 'var(--red)' : 'var(--text-muted)'
                        }}>
                            {trend}
                        </span>
                    </div>
                )}
            </div>
            {Icon && (
                <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110"
                    style={{ backgroundColor: accent + '18', border: `1px solid ${accent}30` }}
                >
                    <Icon size={20} style={{ color: accent }} />
                </div>
            )}
        </div>
    </div>
);

/*     Chart Card                                                 */
export const ChartCard = ({ title, subtitle, children, className = '', action }) => (
    <div className={`glass-card flex flex-col ${className}`}>
        <div className="flex items-center justify-between p-5 pb-3 border-b border-[var(--border-base)]">
            <div>
                <h3 className="heading-card">{title}</h3>
                {subtitle && <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
        <div className="p-5 flex-1">{children}</div>
    </div>
);

/*     Section Header                                             */
export const SectionHeader = ({ title, subtitle, icon: Icon, accent = 'var(--primary)', badge }) => (
    <div className="flex items-center gap-3 mb-6">
        {Icon && (
            <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: accent + '18', border: `1px solid ${accent}30` }}
            >
                <Icon size={18} style={{ color: accent }} />
            </div>
        )}
        <div className="flex-1">
            <div className="flex items-center gap-3">
                <h1 className="heading-page">{title}</h1>
                {badge && (
                    <span
                        className="text-[10px] font-bold px-2.5 py-1 rounded-full border"
                        style={{ color: accent, borderColor: accent + '40', backgroundColor: accent + '12' }}
                    >
                        {badge}
                    </span>
                )}
            </div>
            {subtitle && <p className="text-[12px] text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
        </div>
    </div>
);

/*     Activity Item                                              */
export const ActivityItem = ({ icon: Icon, accent = 'var(--primary)', title, meta, time, status, statusColor }) => (
    <div className="flex items-start gap-3 py-3 border-b border-[var(--border-base)] last:border-0 group">
        <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
            style={{ backgroundColor: accent + '15', border: `1px solid ${accent}25` }}
        >
            {Icon && <Icon size={13} style={{ color: accent }} />}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-medium text-[var(--text-primary)] truncate">{title}</p>
            {meta && <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">{meta}</p>}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
            {time && <span className="text-[10px] text-[var(--text-faint)]">{time}</span>}
            {status && (
                <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md border"
                    style={{ color: statusColor || 'var(--green)', borderColor: (statusColor || 'var(--green)') + '40', backgroundColor: (statusColor || 'var(--green)') + '12' }}
                >
                    {status}
                </span>
            )}
        </div>
    </div>
);

/*     Progress Row                                               */
export const ProgressRow = ({ label, value, max, accent = 'var(--primary)', suffix = '%', showBar = true }) => {
    const pct = max ? (value / max) * 100 : value;
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between items-center">
                <span className="text-[12px] text-[var(--text-secondary)]">{label}</span>
                <span className="text-[12px] font-bold text-[var(--text-primary)] tabular-nums">
                    {max ? value : `${value}${suffix}`}
                    {max && <span className="text-[var(--text-muted)] font-normal"> / {max}</span>}
                </span>
            </div>
            {showBar && (
                <div className="h-1.5 rounded-full bg-[var(--bg-overlay)] overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, pct)}%`, backgroundColor: accent }}
                    />
                </div>
            )}
        </div>
    );
};

/*     Dashboard Grid Layouts                                     */
export const Grid4 = ({ children }) => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{children}</div>
);
export const Grid3 = ({ children }) => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">{children}</div>
);
export const Grid2 = ({ children }) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{children}</div>
);

/*     Custom Recharts Tooltip                                    */
export const DashTooltip = ({ active, payload, label, formatter, labelFormatter }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="glass-card px-4 py-3 shadow-2xl text-[12px]" style={{ minWidth: 140, zIndex: 50 }}>
            <p className="font-bold text-[var(--text-primary)] mb-2">
                {labelFormatter ? labelFormatter(label) : label}
            </p>
            {payload.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-4 mb-1">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-[var(--text-muted)]">{p.name}</span>
                    </div>
                    <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                        {formatter ? formatter(p.value, p.name) : p.value}
                    </span>
                </div>
            ))}
        </div>
    );
};

/*     Loading Spinner                                            */
export const DashboardLoading = () => (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-[var(--border-muted)]" />
            <div className="absolute inset-0 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
        </div>
        <p className="text-[12px] text-[var(--text-muted)]">Loading dashboard </p>
    </div>
);

/*     Table                                                      */
export const DashTable = ({ columns, rows }) => (
    <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
            <thead>
                <tr className="border-b border-[var(--border-base)]">
                    {columns.map((col, i) => (
                        <th key={i} className="label-muted py-2 pr-4 text-left font-bold whitespace-nowrap first:pl-0">
                            {col}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, i) => (
                    <tr key={i} className="border-b border-[var(--border-base)] last:border-0 hover:bg-[var(--bg-hover)] transition-colors">
                        {row.map((cell, j) => (
                            <td key={j} className="py-2.5 pr-4 first:pl-0 text-[var(--text-secondary)]">
                                {cell}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

/*     Role color palette                                         */
export const ROLE_COLORS = {
    sales: { primary: '#3b82f6', secondary: '#06b6d4' },
    survey: { primary: '#f59e0b', secondary: '#f97316' },
    design: { primary: '#8b5cf6', secondary: '#ec4899' },
    pm: { primary: '#06b6d4', secondary: '#3b82f6' },
    store: { primary: '#10b981', secondary: '#22c55e' },
    procurement: { primary: '#f97316', secondary: '#f59e0b' },
    finance: { primary: '#22c55e', secondary: '#10b981' },
    technician: { primary: '#ef4444', secondary: '#f97316' },
    service: { primary: '#ec4899', secondary: '#8b5cf6' },
    admin: { primary: '#2563eb', secondary: '#f59e0b' },
};

/*     Recharts theme helpers                                     */
export const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

export const chartAxisStyle = {
    tick: { fill: 'var(--text-muted)', fontSize: 11 },
    axisLine: false,
    tickLine: false,
};

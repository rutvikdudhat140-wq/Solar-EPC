// Universal KPI Card — unified styling across all modules

import React from 'react';

import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

import { cn } from '../../lib/utils';



/**

 * KPICard props:

 *  label      — string

 *  value      — string | number (formatted externally)

 *  sub        — string (subtitle)

 *  icon       — Lucide icon component

 *  trend      — string (e.g. "+23% YoY")

 *  trendUp    — bool
 *  variant    — string (emerald | blue | amber | red | purple | indigo)
 *  className  — string
 *  style      — object
 *  onClick    — function
 *  loading    — boolean
 */

export const KPICard = ({
    label,
    value,
    sub,
    icon: Icon,
    trend,
    trendUp,
    variant = 'emerald',
    className,

    style,
    onClick,
    loading = false,
}) => {
    const variants = {

        emerald: {
            accent: '#22c55e',
            gradient: 'from-emerald-100 to-green-200',
            iconBg: 'bg-[var(--green)]/10',
            iconColor: 'text-[var(--green)]',
        },
        blue: {
            accent: '#3b82f6',
            gradient: 'from-blue-100 to-sky-200',
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
        },
        amber: {
            accent: '#f59e0b',
            gradient: 'from-amber-100 to-orange-200',
            iconBg: 'bg-[var(--amber)]/10',
            iconColor: 'text-[var(--amber)]',
        },
        red: {
            accent: '#ef4444',
            gradient: 'from-red-100 to-rose-200',
            iconBg: 'bg-[var(--red)]/10',
            iconColor: 'text-[var(--red)]',
        },
        purple: {
            accent: '#8b5cf6',
            gradient: 'from-violet-100 to-purple-200',
            iconBg: 'bg-violet-100',
            iconColor: 'text-violet-600',
        },
        indigo: {
            accent: '#6366f1',
            gradient: 'from-indigo-100 to-slate-200',
            iconBg: 'bg-indigo-100',
            iconColor: 'text-indigo-600',
        },
    };



    const v = variants[variant] || variants.emerald;

    if (loading) {
        return (
            <div
                className={cn(
                    'relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br',
                    v.gradient,
                    'border border-[var(--border-muted)]',
                    'animate-pulse',
                    className
                )}
                style={style}
            >
                <div className="flex items-start justify-between mb-4">
                    <div className={cn('p-3 rounded-xl', v.iconBg)}>
                        <div className="w-[22px] h-[22px] bg-[var(--bg-elevated)] rounded" />
                    </div>
                </div>
                <div className="h-4 w-20 bg-[var(--bg-elevated)] rounded mb-2" />
                <div className="h-8 w-32 bg-[var(--bg-elevated)] rounded" />
            </div>
        );
    }

    return (

        <div
            onClick={onClick}
            className={cn(

                'relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br',

                v.gradient,

                'border border-[var(--border-muted)]',

                'hover:scale-[1.02] transition-all duration-300 cursor-pointer group',
                onClick && 'cursor-pointer',
                className

            )}

            style={{

                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',

                ...style,

            }}

        >

            {/* Background glow effect */}

            <div className="absolute top-0 right-0 w-24 h-24 opacity-10 group-hover:opacity-20 transition-opacity">

                <div

                    className="w-full h-full rounded-full blur-2xl"

                    style={{ backgroundColor: v.accent }}

                />

            </div>



            <div className="flex items-start justify-between mb-4 relative z-10">

                <div className={cn('p-3 rounded-xl shadow-md', v.iconBg)}>

                    {Icon && <Icon size={22} className={v.iconColor} />}

                </div>



{trend && (
                    <div className="flex items-center gap-1">
                        {trendUp
                            ? <ArrowUpRight size={14} className="text-[var(--green)]" />
                            : <ArrowDownRight size={14} className="text-[var(--red)]" />}
                        <span className={cn('text-xs font-semibold', trendUp ? 'text-[var(--green)]' : 'text-[var(--red)]')}>
                            {trend}
                        </span>
                    </div>
                )}

            </div>

            <div className="relative z-10">
                <div className="text-sm font-semibold text-[var(--text-secondary)] mb-1">
                    {label}
                </div>
                <div className="text-3xl font-bold text-[var(--text-primary)]">
                    {value}
                </div>
                {sub && <div className="text-xs text-[var(--text-muted)] mt-1">{sub}</div>}
            </div>
        </div>
    );

};



export default KPICard;


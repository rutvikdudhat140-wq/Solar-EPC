// Universal KPI Card   Inventory Style across all modules

import React from 'react';

import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

import { cn } from '../../lib/utils';


/**

 * KPICard props:

 *  label        string (title)

 *  value        string | number

 *  sub          string (subtitle)

 *  icon         Lucide icon component

 *  trend        string (e.g. "+23%")

 *  trendUp      bool

 *  variant      string (emerald | blue | amber | red | purple | indigo | cyan)

 *  className    string

 *  style        object

 *  onClick      function

 *  loading      boolean

 *  tags         array of strings (optional tags to show at bottom)

 */

export const KPICard = ({
    label,
    value,
    sub,
    icon: Icon,
    trend,
    trendUp,
    variant = 'blue',
    className,
    style,
    onClick,
    loading = false,
    tags,
}) => {
    // Inventory-style color combinations (exact match)
    const variants = {
        blue: {
            from: 'from-blue-100',
            to: 'to-sky-200',
            border: 'border-blue-200',
            text: 'text-blue-700',
            iconBg: 'bg-blue-200',
            iconColor: 'text-blue-700',
            tagBg: 'bg-blue-100',
            tagText: 'text-blue-700',
            shadow: 'shadow-blue-500/10',
        },
        emerald: {
            from: 'from-emerald-100',
            to: 'to-green-200',
            border: 'border-emerald-200',
            text: 'text-emerald-700',
            iconBg: 'bg-emerald-200',
            iconColor: 'text-emerald-700',
            tagBg: 'bg-emerald-100',
            tagText: 'text-emerald-700',
            shadow: 'shadow-emerald-500/10',
        },
        amber: {
            from: 'from-amber-100',
            to: 'to-orange-200',
            border: 'border-amber-200',
            text: 'text-amber-700',
            iconBg: 'bg-amber-200',
            iconColor: 'text-amber-700',
            tagBg: 'bg-amber-100',
            tagText: 'text-amber-700',
            shadow: 'shadow-amber-500/10',
        },
        red: {
            from: 'from-red-100',
            to: 'to-rose-200',
            border: 'border-red-200',
            text: 'text-red-700',
            iconBg: 'bg-red-200',
            iconColor: 'text-red-700',
            tagBg: 'bg-red-100',
            tagText: 'text-red-700',
            shadow: 'shadow-red-500/10',
        },
        purple: {
            from: 'from-violet-100',
            to: 'to-purple-200',
            border: 'border-violet-200',
            text: 'text-violet-700',
            iconBg: 'bg-violet-200',
            iconColor: 'text-violet-700',
            tagBg: 'bg-violet-100',
            tagText: 'text-violet-700',
            shadow: 'shadow-violet-500/10',
        },
        indigo: {
            from: 'from-indigo-100',
            to: 'to-slate-200',
            border: 'border-indigo-200',
            text: 'text-indigo-700',
            iconBg: 'bg-indigo-200',
            iconColor: 'text-indigo-700',
            tagBg: 'bg-indigo-100',
            tagText: 'text-indigo-700',
            shadow: 'shadow-indigo-500/10',
        },
        cyan: {
            from: 'from-cyan-100',
            to: 'to-teal-200',
            border: 'border-cyan-200',
            text: 'text-cyan-700',
            iconBg: 'bg-cyan-200',
            iconColor: 'text-cyan-700',
            tagBg: 'bg-cyan-100',
            tagText: 'text-cyan-700',
            shadow: 'shadow-cyan-500/10',
        },
    };

    const v = variants[variant] || variants.blue;

    if (loading) {
        return (
            <div
                className={cn(
                    'relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br',
                    v.from, v.to,
                    v.border,
                    'border',
                    'animate-pulse',
                    className
                )}
                style={style}
            >
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="h-3 w-20 bg-gray-300 rounded mb-2" />
                        <div className="h-8 w-24 bg-gray-300 rounded" />
                    </div>
                    <div className={cn('w-12 h-12 rounded-xl', v.iconBg)} />
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={onClick}
            className={cn(
                'group relative overflow-hidden bg-gradient-to-br',
                v.from, v.to,
                v.border,
                'border rounded-2xl p-5 cursor-pointer',
                'hover:shadow-xl', v.shadow,
                'hover:-translate-y-1 hover:scale-[1.02]',
                'transition-all duration-300',
                onClick && 'cursor-pointer',
                className
            )}
            style={style}
        >
            {/* Hover overlay */}
            <div className={cn(
                'absolute inset-0 bg-gradient-to-br from-white/40 to-transparent',
                'opacity-0 group-hover:opacity-100 transition-opacity duration-300'
            )} />

            <div className="relative flex items-start justify-between">
                <div className="flex-1">
                    <p className={cn('text-[10px] uppercase tracking-wider font-bold', v.text)}>
                        {label}
                    </p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">
                        {value}
                    </p>
                    {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
                    
                    {trend && (
                        <div className={cn('flex items-center gap-1 mt-2')}>
                            {trendUp
                                ? <ArrowUpRight size={12} className="text-emerald-600" />
                                : <ArrowDownRight size={12} className="text-red-600" />}
                            <span className={cn('text-[10px] font-medium', trendUp ? 'text-emerald-600' : 'text-red-600')}>
                                {trend}
                            </span>
                        </div>
                    )}
                </div>
                <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center',
                    v.iconBg,
                    'group-hover:scale-110 transition-transform duration-300'
                )}>
                    {Icon && <Icon size={24} className={v.iconColor} />}
                </div>
            </div>

            {/* Tags at bottom */}
            {(tags && tags.length > 0) && (
                <div className="relative mt-3 flex gap-2 flex-wrap">
                    {tags.map((tag, i) => (
                        <span key={i} className={cn(
                            'text-[10px] px-2 py-1 rounded font-medium',
                            v.tagBg, v.tagText
                        )}>
                            {tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};


export default KPICard;
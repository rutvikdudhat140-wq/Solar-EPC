// Stepper — config-driven workflow step display
import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Stepper props:
 *  steps   — [{ name, status: 'Done'|'In Progress'|'Pending', date? }]
 *  compact — bool (horizontal pill style)
 */
export const Stepper = ({ steps = [], compact = false }) => {
    if (compact) {
        return (
            <div className="flex items-center gap-1 flex-wrap">
                {steps.map((s, i) => (
                    <React.Fragment key={s.name}>
                        <div className={cn(
                            'px-2.5 py-1 rounded-full text-[10px] font-semibold border',
                            s.status === 'Done' && 'bg-[var(--green)]/15 text-[var(--green)] border-[var(--green)]/30',
                            s.status === 'In Progress' && 'bg-[var(--bg-hover)] text-[var(--primary-light)] border-[var(--border-active)]',
                            s.status === 'Pending' && 'bg-[var(--bg-elevated)] text-[var(--text-faint)] border-[var(--border-base)]'
                        )}>
                            {s.status === 'Done' && <Check size={9} className="inline mr-1" />}
                            {s.name}
                        </div>
                        {i < steps.length - 1 && <div className="w-3 h-px bg-[var(--border-base)]" />}
                    </React.Fragment>
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-0">
            {steps.map((s, i) => {
                const isDone = s.status === 'Done';
                const isActive = s.status === 'In Progress';
                return (
                    <div key={s.name} className="flex items-start gap-3">
                        {/* dot + line */}
                        <div className="flex flex-col items-center">
                            <div className={cn(
                                'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-[10px] font-bold transition-all',
                                isDone && 'border-[var(--green)] bg-[var(--green)] text-white',
                                isActive && 'border-[var(--primary)] bg-[var(--primary-glow)] text-[var(--primary)]',
                                !isDone && !isActive && 'border-[var(--border-muted)] bg-[var(--bg-elevated)] text-[var(--text-faint)]'
                            )}>
                                {isDone ? <Check size={11} /> : i + 1}
                            </div>
                            {i < steps.length - 1 && (
                                <div className={cn('w-px flex-1 min-h-[20px] mt-0.5', isDone ? 'bg-emerald-500/40' : 'bg-[var(--border-base)]')} />
                            )}
                        </div>
                        {/* label */}
                        <div className="pt-0.5 pb-4">
                            <p className={cn(
                                'text-xs font-semibold',
                                isDone && 'text-[var(--green)]',
                                isActive && 'text-[var(--text-primary)]',
                                !isDone && !isActive && 'text-[var(--text-faint)]'
                            )}>{s.name}</p>
                            {s.date && <p className="text-[10px] text-[var(--text-faint)] mt-0.5">{s.date}</p>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default Stepper;

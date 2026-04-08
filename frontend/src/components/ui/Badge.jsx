import React from 'react';
import { cn } from '../../lib/utils';
import { getStatus } from '../../config/status.config';

/**
 * StatusBadge — config-driven, zero hardcoded colours in call-sites
 * Usage: <StatusBadge domain="lead" value="Hot" />
 */
export const StatusBadge = ({ domain, value, className }) => {
  const cfg = getStatus(domain, value);
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border',
      cfg.color, className
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
      {cfg.label}
    </span>
  );
};

/**
 * Badge — generic coloured pill
 */
const BADGE_VARIANTS = {
  default: 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-muted)]',
  blue: 'text-[var(--primary-light)] border-[var(--border-active)]',
  primary: 'text-[var(--primary-light)] border-[var(--border-active)]',
  green: 'bg-[var(--green)]/15 text-[var(--green)] border-[var(--green)]/25',
  red: 'bg-[var(--red)]/15 text-[var(--red)] border-[var(--red)]/25',
  yellow: 'bg-[var(--amber)]/15 text-[var(--amber)] border-[var(--amber)]/25',
  amber: 'bg-[var(--amber)]/15 text-[var(--amber)] border-[var(--amber)]/25',
  cyan: 'bg-[var(--blue)]/15 text-[var(--blue)] border-[var(--blue)]/25',
  orange: 'bg-[var(--primary)]/15 text-[var(--primary)] border-[var(--primary)]/25',
  purple: 'text-[var(--primary-light)] border-[var(--border-active)]',
};

export const Badge = ({ variant = 'default', className, children }) => (
  <span className={cn(
    'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border',
    BADGE_VARIANTS[variant] ?? BADGE_VARIANTS.default,
    className
  )}>
    {children}
  </span>
);

export default Badge;

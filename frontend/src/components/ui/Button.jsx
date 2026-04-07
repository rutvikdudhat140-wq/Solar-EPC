import React from 'react';
import { cn } from '../../lib/utils';

export const Button = React.forwardRef(({
  className, variant = 'primary', size = 'md', loading = false,
  disabled, children, ...props
}, ref) => {
  const base = 'inline-flex items-center justify-center gap-1.5 font-semibold rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed select-none';
  const variants = {
    primary: 'bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-sm shadow-[var(--primary-glow)] active:scale-[0.98]',
    secondary: 'bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] border border-[var(--border-muted)] text-[var(--text-primary)] hover:border-[var(--border-active)]',
    ghost: 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
    danger: 'bg-[var(--red)]/10 hover:bg-[var(--red)]/20 border border-[var(--red)]/30 text-[var(--red)]',
    solar: 'bg-[var(--accent)] hover:bg-[var(--accent-light)] text-[var(--accent-inv)] shadow-sm shadow-[var(--accent-glow)] active:scale-[0.98]',
    outline: 'border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/10',
  };
  const sizes = {
    xs: 'h-6 px-2.5 text-[11px]',
    sm: 'h-7 px-3 text-xs',
    md: 'h-8 px-4 text-xs',
    lg: 'h-9 px-5 text-sm',
  };
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(base, variants[variant] ?? variants.secondary, sizes[size] ?? sizes.md, className)}
      {...props}
    >
      {loading ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
      {children}
    </button>
  );
});
Button.displayName = 'Button';
export default Button;

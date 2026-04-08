import React from 'react';
import { cn } from '../../lib/utils';

const base = 'rounded-lg border border-[var(--border-base)] bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--border-active)] transition-all duration-150 text-xs';

export const Input = React.forwardRef(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(base, 'h-8 px-3', className)} {...props} />
));
Input.displayName = 'Input';

export const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(base, 'px-3 py-2 resize-none', className)} {...props} />
));
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(base, 'h-8 px-3 cursor-pointer', className)} {...props}>
    {children}
  </select>
));
Select.displayName = 'Select';

export const Label = ({ className, children, ...props }) => (
  <label className={cn('block text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1', className)} {...props}>
    {children}
  </label>
);

export const FormField = ({ label, error, children, className }) => (
  <div className={cn('flex flex-col gap-1', className)}>
    {label && <Label>{label}</Label>}
    {children}
    {error && <p className="text-[11px] text-[var(--red)] mt-0.5">{error}</p>}
  </div>
);

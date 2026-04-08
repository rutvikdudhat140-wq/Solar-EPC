import React from 'react';
import { cn } from '../../lib/utils';

export const PageHeader = ({ 
  title, 
  subtitle, 
  tabs = [], 
  activeTab, 
  onTabChange, 
  actions = [],
  preTabsContent = null,
  className 
}) => {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Title Section - Left side */}
        <div>
          <h1 className="heading-page">{title}</h1>
          {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
        </div>

        {/* Right Section: Tabs + Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Pre-tabs content (e.g., view toggle buttons) */}
          {preTabsContent && (
            <div className="flex items-center gap-1">
              {preTabsContent}
            </div>
          )}
          
          {/* Tabs/Pills */}
          {tabs.length > 0 && (
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)]">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                    activeTab === tab.id
                      ? 'bg-[var(--primary)] text-white shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                  )}
                >
                  {tab.icon && <tab.icon size={14} />}
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Actions */}
          {actions.length > 0 && (
            <div className="flex items-center gap-2">
              {actions.map((action, index) => (
                <React.Fragment key={index}>
                  {action.type === 'toggle' ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-base)]">
                      {action.icon && <action.icon size={14} className="text-[var(--text-muted)]" />}
                      <span className="text-xs text-[var(--text-muted)]">{action.label}</span>
                      <button
                        onClick={action.onToggle}
                        className={cn(
                          'w-9 h-5 rounded-full transition-colors relative',
                          action.value ? 'bg-[var(--green)]' : 'bg-[var(--border-muted)]'
                        )}
                      >
                        <span className={cn(
                          'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
                          action.value ? 'left-[18px]' : 'left-0.5'
                        )} />
                      </button>
                    </div>
                  ) : action.type === 'button' ? (
                    <button
                      onClick={action.onClick}
                      disabled={action.disabled}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border',
                        action.variant === 'primary'
                          ? 'bg-[var(--primary)] text-white border-[var(--primary)] hover:opacity-90'
                          : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-base)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
                      )}
                    >
                      {action.icon && <action.icon size={14} />}
                      {action.label}
                    </button>
                  ) : null}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;

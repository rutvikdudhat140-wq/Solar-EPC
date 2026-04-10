import React, { useMemo } from 'react';
import { cn } from '../../lib/utils';

/**
 * LeadProgressBar - A reusable progress bar component for CRM leads
 * 
 * Calculates progress dynamically based on the lead's current stage and the
 * configured status options. Progress is determined by the stage's order
 * relative to the total pipeline stages.
 * 
 * @param {string} stageKey - The current stage key of the lead (e.g., 'new', 'contacted', 'won')
 * @param {Array} statusOptions - Array of status objects with { key, label, color, order }
 * @param {number} progress - Optional explicit progress value (0-100). If not provided, calculated from stage
 * @param {string} className - Additional CSS classes
 * @param {boolean} showLabel - Whether to show the percentage label (default: true)
 * @param {boolean} showStageLabel - Whether to show the stage name label (default: false)
 * @param {string} size - Size variant: 'sm' | 'md' | 'lg' (default: 'md')
 * @param {boolean} animated - Whether to animate progress changes (default: true)
 */
export const LeadProgressBar = ({
  stageKey,
  statusOptions = [],
  progress,
  className,
  showLabel = true,
  showStageLabel = false,
  size = 'md',
  animated = true,
}) => {
  // Calculate progress based on stage order (same as Lead Tracker)
  const calculatedProgress = useMemo(() => {
    // If explicit progress is provided, use it
    if (progress !== undefined && progress !== null) {
      return Math.min(100, Math.max(0, Number(progress) || 0));
    }

    if (!stageKey || !Array.isArray(statusOptions) || statusOptions.length === 0) {
      return 0;
    }

    // Normalize stage key
    const normalizedStageKey = String(stageKey).toLowerCase().trim();

    // Find current stage index in statusOptions
    const currentIndex = statusOptions.findIndex(
      s => String(s.key).toLowerCase() === normalizedStageKey
    );

    if (currentIndex === -1) {
      // Try partial matching
      const partialIndex = statusOptions.findIndex(
        s => normalizedStageKey.includes(String(s.key).toLowerCase())
      );
      if (partialIndex === -1) return 0;
      
      // Calculate: (current position / total stages) * 100
      return Math.round(((partialIndex + 1) / statusOptions.length) * 100);
    }

    // Calculate progress like Lead Tracker: (stage position / total stages) * 100
    return Math.round(((currentIndex + 1) / statusOptions.length) * 100);
  }, [stageKey, statusOptions, progress]);

  // Get current stage info for display
  const currentStageInfo = useMemo(() => {
    if (!stageKey || !Array.isArray(statusOptions)) return null;
    
    const normalizedStageKey = String(stageKey).toLowerCase();
    return statusOptions.find(
      s => String(s.key).toLowerCase() === normalizedStageKey
    );
  }, [stageKey, statusOptions]);

  // Determine bar color based on progress
  const barColor = useMemo(() => {
    // Use stage color if available
    if (currentStageInfo?.color) {
      return currentStageInfo.color;
    }
    
    // Fallback to progress-based gradient
    if (calculatedProgress >= 80) return '#22c55e'; // green-500
    if (calculatedProgress >= 60) return '#10b981'; // emerald-500
    if (calculatedProgress >= 40) return '#3b82f6'; // blue-500
    if (calculatedProgress >= 20) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  }, [calculatedProgress, currentStageInfo]);

  // Size-based height classes
  const heightClasses = {
    sm: 'h-1',
    md: 'h-1.5',
    lg: 'h-2',
  };

  // Size-based text classes
  const textClasses = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Label row */}
      {(showLabel || showStageLabel) && (
        <div className="flex items-center justify-between mb-1">
          {showStageLabel && (
            <span className={cn(
              'font-medium text-[var(--text-secondary)] truncate',
              textClasses[size]
            )}>
              {currentStageInfo?.label || stageKey}
            </span>
          )}
          {showLabel && (
            <span className={cn(
              'font-semibold tabular-nums',
              textClasses[size],
              calculatedProgress >= 80 ? 'text-emerald-500' :
                calculatedProgress >= 50 ? 'text-blue-500' :
                  calculatedProgress >= 25 ? 'text-amber-500' : 'text-red-500'
            )}>
              {calculatedProgress}%
            </span>
          )}
        </div>
      )}
      
      {/* Progress bar track */}
      <div 
        className={cn(
          'w-full rounded-full bg-[var(--bg-elevated)] overflow-hidden',
          heightClasses[size]
        )}
        role="progressbar"
        aria-valuenow={calculatedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Lead progress: ${calculatedProgress}%`}
      >
        {/* Progress bar fill */}
        <div
          className={cn(
            'h-full rounded-full',
            animated && 'transition-all duration-500 ease-out'
          )}
          style={{
            width: `${calculatedProgress}%`,
            backgroundColor: barColor,
            boxShadow: calculatedProgress > 0 ? `0 0 8px ${barColor}40` : 'none',
          }}
        />
      </div>
    </div>
  );
};

/**
 * Helper function to calculate progress based on stage order
 * Exported for use in both component and hook
 */
export function calculateLeadProgressFromOrder(currentOrder, options) {
  // Filter out terminal states (success/failure) to get only pipeline stages
  const pipelineStages = options.filter(s => {
    const key = String(s.key).toLowerCase();
    const isSuccess = ['won', 'win', 'closed-won', 'closed_won', 'success', 'converted'].some(term => key.includes(term));
    const isFailure = ['lost', 'lose', 'closed-lost', 'closed_lost', 'dead'].some(term => key.includes(term));
    return !isSuccess && !isFailure;
  });

  if (pipelineStages.length === 0) return 0;

  const minOrder = Math.min(...pipelineStages.map(s => s.order ?? 0));
  const maxOrder = Math.max(...pipelineStages.map(s => s.order ?? 0));

  if (maxOrder === minOrder) return 50; // Single stage in pipeline

  // Normalize current order to 0-100 range and clamp
  const normalizedProgress = ((currentOrder - minOrder) / (maxOrder - minOrder)) * 100;
  return Math.min(100, Math.max(0, Math.round(normalizedProgress)));
}

/**
 * Helper hook to calculate lead progress
 * Can be used independently when you just need the progress value
 */
export const useLeadProgress = (stageKey, statusOptions = [], explicitProgress) => {
  return React.useMemo(() => {
    // If explicit progress is provided, use it
    if (explicitProgress !== undefined && explicitProgress !== null) {
      return Math.min(100, Math.max(0, Number(explicitProgress) || 0));
    }

    if (!stageKey || !Array.isArray(statusOptions) || statusOptions.length === 0) {
      return 0;
    }

    // Normalize stage key
    const normalizedStageKey = String(stageKey).toLowerCase().trim();

    // Find current stage index in statusOptions (same as Lead Tracker logic)
    const currentIndex = statusOptions.findIndex(
      s => String(s.key).toLowerCase() === normalizedStageKey
    );

    if (currentIndex === -1) {
      // Try partial matching
      const partialIndex = statusOptions.findIndex(
        s => normalizedStageKey.includes(String(s.key).toLowerCase())
      );
      if (partialIndex === -1) return 0;
      
      return Math.round(((partialIndex + 1) / statusOptions.length) * 100);
    }

    // Calculate: (stage position / total stages) * 100
    return Math.round(((currentIndex + 1) / statusOptions.length) * 100);
  }, [stageKey, statusOptions, explicitProgress]);
};

export default LeadProgressBar;
